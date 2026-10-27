import React, { useState, useEffect } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import { TestIntegrityPassport } from '../types';
import { api } from '../services/api';
import { PassportCard } from '../components/PassportCard';

interface PassportPageProps {
  evaluationId: string;
}

export const PassportPage: React.FC<PassportPageProps> = ({ evaluationId }) => {
  const [passport, setPassport] = useState<TestIntegrityPassport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (evaluationId) {
      loadPassport();
    }
  }, [evaluationId]);

  const loadPassport = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPassport(evaluationId);
      setPassport(data);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!passport) return;
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bastionloop-passport-${passport.evaluation_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!passport) {
    return (
      <div className="p-12 text-center text-xs font-mono text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-subtle">
        <Award className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-bounce" />
        <div>Generating verifiable Test Integrity Passport...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PassportCard passport={passport} onExportJson={handleExportJson} />
    </div>
  );
};
