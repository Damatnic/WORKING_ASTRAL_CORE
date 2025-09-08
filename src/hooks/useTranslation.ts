import { useState, useCallback } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt';

interface TranslationHook {
  t: (key: string, params?: Record<string, any>) => string;
  language: Language;
  changeLanguage: (lang: Language) => void;
}

// Basic translation strings
const translations: Record<Language, Record<string, any>> = {
  en: {
    'crisis.alert': 'Crisis Alert: {{level}} level detected',
    'crisis.get_help': 'Get Help Now',
    'chat.recording': 'Recording...',
    'chat.type_message': 'How are you feeling today?',
    'chat.safety_notice': 'This is a safe space. If you\'re in crisis, please contact emergency services.',
    'footer.encrypted': 'End-to-end encrypted',
    'footer.human_oversight': 'Human oversight available',
    'footer.crisis_hotline': 'Crisis Hotline 988'
  },
  es: {
    'crisis.alert': 'Alerta de Crisis: Nivel {{level}} detectado',
    'crisis.get_help': 'Obtener Ayuda Ahora',
    'chat.recording': 'Grabando...',
    'chat.type_message': '¿Cómo te sientes hoy?',
    'chat.safety_notice': 'Este es un espacio seguro. Si estás en crisis, contacta servicios de emergencia.',
    'footer.encrypted': 'Cifrado de extremo a extremo',
    'footer.human_oversight': 'Supervisión humana disponible',
    'footer.crisis_hotline': 'Línea de Crisis 988'
  },
  fr: {
    'crisis.alert': 'Alerte de Crise: Niveau {{level}} détecté',
    'crisis.get_help': 'Obtenir de l\'aide maintenant',
    'chat.recording': 'Enregistrement...',
    'chat.type_message': 'Comment vous sentez-vous aujourd\'hui?',
    'chat.safety_notice': 'Ceci est un espace sûr. Si vous êtes en crise, contactez les services d\'urgence.',
    'footer.encrypted': 'Chiffré de bout en bout',
    'footer.human_oversight': 'Supervision humaine disponible',
    'footer.crisis_hotline': 'Ligne de Crise 988'
  },
  de: {
    'crisis.alert': 'Krisenmeldung: {{level}} Level erkannt',
    'crisis.get_help': 'Jetzt Hilfe holen',
    'chat.recording': 'Aufnahme...',
    'chat.type_message': 'Wie fühlst du dich heute?',
    'chat.safety_notice': 'Dies ist ein sicherer Raum. Falls Sie sich in einer Krise befinden, kontaktieren Sie den Notdienst.',
    'footer.encrypted': 'Ende-zu-Ende verschlüsselt',
    'footer.human_oversight': 'Menschliche Aufsicht verfügbar',
    'footer.crisis_hotline': 'Krisenlinie 988'
  },
  pt: {
    'crisis.alert': 'Alerta de Crise: Nível {{level}} detectado',
    'crisis.get_help': 'Obter Ajuda Agora',
    'chat.recording': 'Gravando...',
    'chat.type_message': 'Como você está se sentindo hoje?',
    'chat.safety_notice': 'Este é um espaço seguro. Se você estiver em crise, entre em contato com os serviços de emergência.',
    'footer.encrypted': 'Criptografado de ponta a ponta',
    'footer.human_oversight': 'Supervisão humana disponível',
    'footer.crisis_hotline': 'Linha de Crise 988'
  }
};

export function useTranslation(): TranslationHook {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string, params?: Record<string, any>): string => {
    const translation = translations[language];
    let text = translation[key] || key;
    
    // Simple template replacement
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });
    }
    
    return text;
  }, [language]);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);

  return {
    t,
    language,
    changeLanguage
  };
}