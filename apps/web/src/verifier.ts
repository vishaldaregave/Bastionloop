import nacl from "tweetnacl";

export type CheckStatus = "pass" | "fail" | "warn";
export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

export type PinnedKey = {
  key_id: string;
  public_key_b64: string;
  pem?: string;
};

export type PinnedKeys = {
  keys: {
    signer: PinnedKey;
    witness: PinnedKey;
    control?: PinnedKey;
  };
};

const CHECKPOINT_DOMAIN = "bastionloop-checkpoint-v1";
const PCF_DOMAIN = "bastionloop-pcf-v1";
const ANCHOR_DOMAIN = "bastionloop-anchor-v1";

export function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const source = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const copy = new Uint8Array(source.length);
  copy.set(source);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", copy.buffer));
}

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  return bytesToHex(await sha256(data));
}

export function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return "null";
}

export async function hashObject(value: unknown): Promise<string> {
  return sha256Hex(canonical(value));
}

async function merkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return sha256Hex("bastionloop:empty-merkle");
  let level = leaves.map((hex) => concat([new Uint8Array([0]), hexToBytes(hex)]));
  level = await Promise.all(level.map((leaf) => sha256(leaf)));
  while (level.length > 1) {
    if (level.length % 2 === 1) level = [...level, level[level.length - 1]];
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(await sha256(concat([new Uint8Array([1]), level[i], level[i + 1]])));
    }
    level = next;
  }
  return bytesToHex(level[0]);
}

function genesisHash(): Promise<string> {
  return sha256Hex("bastionloop:genesis:v1");
}

function withoutSignatures(pcf: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pcf)) if (key !== "signatures") copy[key] = value;
  return copy;
}

function signerPublicKey(pinned: PinnedKeys): Uint8Array | null {
  const key = pinned?.keys?.signer?.public_key_b64;
  if (!key) return null;
  try {
    const bytes = b64ToBytes(key);
    return bytes.length === 32 ? bytes : null;
  } catch {
    return null;
  }
}

function verifySignature(signatureB64: string, message: Uint8Array, publicKey: Uint8Array): boolean {
  try {
    return nacl.sign.detached.verify(message, b64ToBytes(signatureB64), publicKey);
  } catch {
    return false;
  }
}

function recordForEvent(event: any) {
  return {
    event_id: event.event_id,
    ts: event.ts,
    run_id: event.run_id ?? null,
    tenant_id: event.tenant_id ?? null,
    event_type: event.event_type,
    policy_version: event.policy_version ?? null,
    metadata: event.metadata ?? {},
    prev_hash: event.prev_hash,
  };
}

export async function verifyPcfInBrowser(
  pcf: any,
  pinned: PinnedKeys,
): Promise<{ ok: boolean; checks: Check[]; head: { seq: number; hash: string } | null }> {
  const checks: Check[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string) => {
    checks.push({ id, label, status, detail });
  };

  const signer = pinned?.keys?.signer;
  const witness = pinned?.keys?.witness;
  const signerPub = signerPublicKey(pinned);

  if (!signer || !signerPub) {
    add("pinned-keys", "Pinned public keys loaded", "fail", "No pinned signer key supplied.");
    return { ok: false, checks, head: null };
  }
  add("pinned-keys", "Pinned public keys loaded", "pass", `signer ${signer.key_id}`);

  const signatureBlock = pcf?.signatures?.signer;
  if (!signatureBlock?.signature) {
    add("signature", "PCF signature", "fail", "Missing signatures.signer.signature");
  } else {
    if (signatureBlock.key_id && signatureBlock.key_id !== signer.key_id) {
      add("signature-key", "Signature key is pinned", "fail", `signed by ${signatureBlock.key_id}, pinned ${signer.key_id}`);
    } else {
      add("signature-key", "Signature key is pinned", "pass", signer.key_id);
    }
    let payloadBytes: Uint8Array | null = null;
    if (signatureBlock.payload_b64) {
      try {
        payloadBytes = b64ToBytes(signatureBlock.payload_b64);
      } catch {
        payloadBytes = null;
      }
    }
    if (!payloadBytes) {
      payloadBytes = new TextEncoder().encode(
        canonical({ ...withoutSignatures(pcf), domain: PCF_DOMAIN }),
      );
      add("signature-payload", "Exact signed bytes present", "warn", "Falling back to recomputed canonical bytes.");
    } else {
      add("signature-payload", "Exact signed bytes present", "pass", `${payloadBytes.length} bytes`);
    }
    const valid = verifySignature(signatureBlock.signature, payloadBytes, signerPub);
    add("signature", "PCF signature", valid ? "pass" : "fail", valid ? "Ed25519 signature verifies" : "Signature does not verify");
    if (valid && signatureBlock.payload_b64) {
      try {
        const payloadObject = JSON.parse(new TextDecoder().decode(payloadBytes));
        if (payloadObject && typeof payloadObject === "object" && "domain" in payloadObject) {
          delete payloadObject.domain;
        }
        const matches = canonical(payloadObject) === canonical(withoutSignatures(pcf));
        add(
          "signature-semantics",
          "Signature covers this exact PCF",
          matches ? "pass" : "fail",
          matches ? "Signed payload matches the document" : "Document differs from the signed payload",
        );
      } catch (err) {
        add("signature-semantics", "Signature covers this exact PCF", "fail", String(err));
      }
    }
  }

  const commitment = pcf?.payload?.commitment;
  const reveal = pcf?.payload?.reveal;
  if (!commitment || reveal === undefined) {
    add("commit-reveal", "Commit-reveal", "fail", "Missing payload commitment or reveal.");
  } else {
    const recomputed = await hashObject(reveal);
    add(
      "commit-reveal",
      "Commit-reveal",
      recomputed === commitment ? "pass" : "fail",
      recomputed === commitment ? "Revealed payload matches commitment" : "Reveal does not match commitment",
    );
  }

  const ledger = pcf?.ledger;
  const events = Array.isArray(ledger?.events)
    ? [...ledger.events].sort((a: any, b: any) => Number(a.seq) - Number(b.seq))
    : [];
  const records = new Map<number, string>(
    Array.isArray(ledger?.canonical_records)
      ? ledger.canonical_records.map((entry: any) => [Number(entry.seq), String(entry.b64)])
      : [],
  );

  if (events.length === 0) {
    add("chain", "Ledger hash chain", "fail", "No ledger events in the PCF.");
  } else {
    const genesis = await genesisHash();
    let prev = genesis;
    let broken: string | null = null;
    let expectedSeq = 1;
    for (const event of events) {
      if (Number(event.seq) !== expectedSeq) {
        broken = `sequence gap at ${event.seq}`;
        break;
      }
      expectedSeq += 1;
      const canonicalB64 = records.get(Number(event.seq));
      if (!canonicalB64) {
        broken = `missing canonical record for seq ${event.seq}`;
        break;
      }
      let recordBytes: Uint8Array;
      try {
        recordBytes = b64ToBytes(canonicalB64);
      } catch {
        broken = `bad canonical record encoding at seq ${event.seq}`;
        break;
      }
      if (event.prev_hash !== prev) {
        broken = `prev hash mismatch at seq ${event.seq}`;
        break;
      }
      const digest = await sha256Hex(concat([new TextEncoder().encode(prev), recordBytes]));
      if (digest !== event.event_hash) {
        broken = `event hash mismatch at seq ${event.seq}`;
        break;
      }
      try {
        const parsed = JSON.parse(new TextDecoder().decode(recordBytes));
        if (canonical(parsed) !== canonical(recordForEvent(event))) {
          broken = `event content differs from canonical record at seq ${event.seq}`;
          break;
        }
      } catch {
        broken = `canonical record is not JSON at seq ${event.seq}`;
        break;
      }
      prev = event.event_hash;
    }
    const head = events[events.length - 1];
    add(
      "chain",
      "Ledger hash chain",
      broken ? "fail" : "pass",
      broken ? broken : `${events.length} events re-hashed from genesis`,
    );
    if (!broken) {
      const matchesHead =
        Number(pcf?.chain?.seq) === Number(head.seq) && pcf?.chain?.event_hash === head.event_hash;
      add(
        "chain-position",
        "PCF points at the ledger head",
        matchesHead ? "pass" : "fail",
        matchesHead ? `seq ${head.seq}` : "PCF chain position does not match the proof",
      );
    }
    const found = events.some(
      (event: any) =>
        event.event_type === "finding.created" &&
        event.metadata?.finding_id === pcf?.finding_id,
    );
    add(
      "finding-event",
      "Finding event is in the chain",
      found ? "pass" : "fail",
      found ? String(pcf?.finding_id) : "No matching finding.created event",
    );
  }

  const checkpoint = ledger?.checkpoints?.[0];
  if (!checkpoint) {
    add("checkpoint", "Signed checkpoint", "fail", "No checkpoint in the ledger proof.");
  } else {
    const core = {
      counter: checkpoint.counter,
      upto_seq: checkpoint.upto_seq,
      last_hash: checkpoint.last_hash,
      merkle_root: checkpoint.merkle_root,
      created_at: checkpoint.created_at,
    };
    const coreHash = await hashObject(core);
    add(
      "checkpoint-hash",
      "Checkpoint is self-consistent",
      coreHash === checkpoint.checkpoint_hash ? "pass" : "fail",
      coreHash === checkpoint.checkpoint_hash ? `counter ${core.counter}` : "Checkpoint hash mismatch",
    );
    const covered = events.filter((event: any) => Number(event.seq) <= Number(checkpoint.upto_seq));
    const root = await merkleRoot(covered.map((event: any) => event.event_hash));
    add(
      "checkpoint-merkle",
      "Checkpoint Merkle root",
      root === checkpoint.merkle_root ? "pass" : "fail",
      root === checkpoint.merkle_root ? `${covered.length} leaves` : "Merkle root mismatch",
    );
    const last = covered[covered.length - 1];
    add(
      "checkpoint-last",
      "Checkpoint last event hash",
      last?.event_hash === checkpoint.last_hash ? "pass" : "fail",
      last?.event_hash === checkpoint.last_hash ? `seq ${last.seq}` : "Last hash mismatch",
    );
    const signingBytes = new TextEncoder().encode(
      canonical({
        domain: CHECKPOINT_DOMAIN,
        checkpoint: core,
        checkpoint_hash: checkpoint.checkpoint_hash,
      }),
    );
    const signerOk = checkpoint.signer_sig
      ? verifySignature(checkpoint.signer_sig, signingBytes, signerPub)
      : false;
    add(
      "checkpoint-signer",
      "Checkpoint signer signature",
      signerOk ? "pass" : "fail",
      signerOk ? "Ed25519 verifies" : "Signer signature invalid",
    );
    if (witness?.public_key_b64) {
      const witnessPub = b64ToBytes(witness.public_key_b64);
      const witnessOk = checkpoint.witness_sig
        ? verifySignature(checkpoint.witness_sig, signingBytes, witnessPub)
        : false;
      add(
        "checkpoint-witness",
        "Checkpoint witness co-signature",
        witnessOk ? "pass" : "fail",
        witnessOk ? `witness ${witness.key_id}` : "Witness signature invalid",
      );
    } else {
      add("checkpoint-witness", "Checkpoint witness co-signature", "warn", "No pinned witness key.");
    }

    const anchorEntries: any[] = Array.isArray(ledger?.anchor_entries) ? ledger.anchor_entries : [];
    if (anchorEntries.length === 0) {
      add("anchor", "External anchor", "fail", "No anchor entries in the proof.");
    } else {
      const genesis = await genesisHash();
      let prev = genesis;
      let anchorBroken: string | null = null;
      for (const entry of anchorEntries) {
        const coreEntry = { ...entry };
        delete coreEntry.anchor_hash;
        if (coreEntry.prev_anchor_hash !== prev) {
          anchorBroken = `anchor chain break at ${entry.counter}`;
          break;
        }
        const expected = await hashObject({ domain: ANCHOR_DOMAIN, ...coreEntry });
        if (expected !== entry.anchor_hash) {
          anchorBroken = `anchor hash mismatch at ${entry.counter}`;
          break;
        }
        prev = entry.anchor_hash;
      }
      add(
        "anchor-chain",
        "External anchor chain",
        anchorBroken ? "fail" : "pass",
        anchorBroken ?? `${anchorEntries.length} anchor entries chained`,
      );
      const match = anchorEntries.find((entry: any) => Number(entry.counter) === Number(checkpoint.counter));
      const matches =
        match &&
        match.checkpoint_hash === checkpoint.checkpoint_hash &&
        match.merkle_root === checkpoint.merkle_root;
      add(
        "anchor",
        "Checkpoint is externally anchored",
        matches ? "pass" : "fail",
        matches ? `anchor ${checkpoint.counter}` : "No matching anchor entry",
      );
    }
  }

  add(
    "policy",
    "Policy bundle pinned in evidence",
    pcf?.policy?.bundle_hash && pcf?.policy?.version ? "pass" : "fail",
    pcf?.policy?.bundle_hash ? `${pcf.policy.version} / ${String(pcf.policy.bundle_hash).slice(0, 12)}...` : "Missing policy hash",
  );
  add(
    "images",
    "Runtime image digests recorded",
    pcf?.images?.gateway ? "pass" : "fail",
    pcf?.images?.gateway ? `${pcf.images.gateway} / ${pcf.images.model_adapter}` : "Missing image digests",
  );
  add(
    "freshness",
    "Model session freshness proof",
    pcf?.model?.freshness_proof ? "pass" : "fail",
    pcf?.model?.freshness_proof ? `session ${pcf.model.session_id}` : "Missing freshness proof",
  );
  add(
    "canary",
    "Six-channel canary scan record",
    pcf?.canary_scan ? "pass" : "fail",
    pcf?.canary_scan ? `${pcf.canary_scan.channels_scanned?.length ?? 0} channels scanned` : "Missing canary scan",
  );
  add(
    "non-claims",
    "Explicit non-claims attached",
    Array.isArray(pcf?.trust?.non_claims) && pcf.trust.non_claims.length > 0 ? "pass" : "warn",
    Array.isArray(pcf?.trust?.non_claims) ? `${pcf.trust.non_claims.length} non-claims` : "No non-claims",
  );

  const head = events.length
    ? { seq: Number(events[events.length - 1].seq), hash: events[events.length - 1].event_hash }
    : null;
  const ok = checks.every((check) => check.status !== "fail");
  return { ok, checks, head };
}
