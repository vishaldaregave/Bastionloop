package bastionloop.authz

default decision := {"decision": "deny", "rule_id": "default", "reasons": ["no rule matched"]}

decision := {"decision": effect, "rule_id": rule.id, "reasons": ["matched"]} if {
  rule := input.bundle.rules[_]
  action_match(rule.actions, input.action)
  when_match(rule.when, input.context)
  effect := rule.effect
}

action_match(actions, action) if {
  a := actions[_]
  a == action
}

action_match(actions, action) if {
  a := actions[_]
  a == "*"
}

action_match(actions, action) if {
  a := actions[_]
  endswith(a, ":*")
  startswith(action, substring(a, 0, count(a) - 1))
}

when_match(when, ctx) if {
  not when.same_tenant
}

when_match(when, ctx) if {
  when.same_tenant
  ctx.tenant_id == ctx.target_tenant
}

when_match(when, ctx) if {
  not when.tenant_in
}

when_match(when, ctx) if {
  when.tenant_in[_] == ctx.tenant_id
}

when_match(when, ctx) if {
  not when.run_scoped
}

when_match(when, ctx) if {
  when.run_scoped
  ctx.run_id != ""
}
