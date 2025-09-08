"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { THERAPISTS, TherapistProfile, TherapistSpecialty } from '@/data/therapists';
import { useTherapist } from '@/hooks/useTherapist';

export default function TherapistCatalogPage() {
  const { therapist, select } = useTherapist();
  const [filter, setFilter] = useState<TherapistSpecialty | 'all'>('all');
  const filtered = useMemo(
    () => (filter === 'all' ? THERAPISTS : THERAPISTS.filter(t => t.specialty.includes(filter))),
    [filter]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-wellness-calm/10">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Choose Your AI Therapist</h1>
          <Link href="/therapy" className="text-primary-600 hover:text-primary-700">Back to Therapy</Link>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {(['all','anxiety','depression','trauma','adhd','relationships','addiction','grief','stress','dbt','cbt','mindfulness','career','selfesteem','family','lgbtq','bipolar','eating','sleep'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s as any)}
                className={`px-3 py-1 rounded-full text-sm border ${filter===s? 'bg-primary-600 text-white border-primary-600':'hover:bg-neutral-50'}`}
              >
                {String(s).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <TherapistCard key={t.id} t={t} onSelect={() => selectAndGo(select, t)} active={therapist?.id===t.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function selectAndGo(select: (t: TherapistProfile)=>void, t: TherapistProfile) {
  select(t);
  if (typeof window !== 'undefined') window.location.href = '/therapy';
}

function TherapistCard({ t, onSelect, active }: { t: TherapistProfile; onSelect: ()=>void; active: boolean }) {
  const [showSamples, setShowSamples] = useState(false);

  return (
    <div className="p-5 bg-white border rounded-2xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="text-2xl" aria-hidden>{t.avatar}</div>
          <div className="flex-1">
            <h3 className="font-semibold">{t.name}</h3>
            <p className="text-xs text-neutral-500">{t.specialty.map(s=>s.toUpperCase()).join(' · ')} · Tone: {t.tone}</p>
          </div>
        </div>
        <p className="text-sm text-neutral-700 mb-3">{t.description}</p>
        
        {t.credentials && (
          <p className="text-xs text-neutral-500 mb-2">
            <strong>Background:</strong> {t.credentials}
          </p>
        )}
        
        {t.approach && (
          <p className="text-xs text-neutral-500 mb-2">
            <strong>Approach:</strong> {t.approach}
          </p>
        )}
        
        <p className="text-xs text-neutral-500 mb-3">Languages: {t.languages.join(', ')}</p>

        {t.samplePrompts && t.samplePrompts.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              {showSamples ? '↓' : '→'} Try sample prompts
            </button>
            
            {showSamples && (
              <div className="mt-2 space-y-1">
                {t.samplePrompts.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSelect();
                      setTimeout(() => {
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('samplePrompt', prompt);
                          window.location.href = '/therapy';
                        }
                      }, 100);
                    }}
                    className="block w-full text-left text-xs text-neutral-600 hover:text-primary-600 hover:bg-neutral-50 p-2 rounded border-l-2 border-neutral-200 hover:border-primary-300 transition-colors"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={onSelect}
          className={`flex-1 px-4 py-2 rounded-lg font-medium ${active? 'bg-neutral-200':'bg-primary-600 text-white hover:bg-primary-700'}`}
        >
          {active ? 'Selected' : 'Choose'}
        </button>
      </div>
    </div>
  );
}

