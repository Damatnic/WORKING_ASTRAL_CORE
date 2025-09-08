"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  MessageCircle, 
  Globe, 
  MapPin, 
  Clock,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';

interface EmergencyContact {
  name: string;
  number?: string;
  description: string;
  availableVia: string[];
  website?: string;
  languages?: string;
  textMessage?: string;
}

interface ContactCategory {
  category: string;
  contacts: EmergencyContact[];
}

export default function EmergencyContactsPage() {
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const emergencyContacts: ContactCategory[] = [
    {
      category: "National Crisis Hotlines",
      contacts: [
        {
          name: "988 Suicide & Crisis Lifeline",
          number: "988",
          description: "24/7 free and confidential support for people in distress and prevention and crisis resources",
          availableVia: ["phone", "chat", "text"],
          website: "https://988lifeline.org",
          languages: "Multiple languages available"
        },
        {
          name: "Crisis Text Line",
          number: "741741",
          description: "Free 24/7 support via text message",
          availableVia: ["text"],
          textMessage: "Text HOME to 741741",
          website: "https://crisistextline.org"
        },
        {
          name: "National Domestic Violence Hotline",
          number: "1-800-799-7233",
          description: "24/7 confidential support for domestic violence survivors",
          availableVia: ["phone", "chat"],
          website: "https://thehotline.org"
        }
      ]
    },
    {
      category: "LGBTQ+ Support",
      contacts: [
        {
          name: "The Trevor Project",
          number: "1-866-488-7386",
          description: "24/7 crisis support for LGBTQ+ young people",
          availableVia: ["phone", "chat", "text"],
          website: "https://thetrevorproject.org",
          textMessage: "Text START to 678678"
        },
        {
          name: "Trans Lifeline",
          number: "877-565-8860",
          description: "Peer support hotline for transgender people",
          availableVia: ["phone"],
          website: "https://translifeline.org"
        }
      ]
    },
    {
      category: "Veterans Support",
      contacts: [
        {
          name: "Veterans Crisis Line",
          number: "1-800-273-8255",
          description: "24/7 confidential support for veterans in crisis",
          availableVia: ["phone", "chat", "text"],
          website: "https://veteranscrisisline.net",
          textMessage: "Text 838255"
        }
      ]
    },
    {
      category: "International Support",
      contacts: [
        {
          name: "International Association for Suicide Prevention",
          description: "Directory of crisis centers worldwide",
          availableVia: ["website"],
          website: "https://iasp.info/resources/Crisis_Centres/"
        },
        {
          name: "Befrienders Worldwide",
          description: "Emotional support around the world",
          availableVia: ["website"],
          website: "https://befrienders.org"
        }
      ]
    }
  ];

  const copyToClipboard = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedNumber(number);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch (err) {
      console.error('Failed to copy number:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-crisis-background via-red-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center mb-8"
          >
            <Link href="/crisis" className="mr-4">
              <ArrowLeft className="w-6 h-6 text-neutral-600 hover:text-neutral-800 transition-colors" />
            </Link>
            <div className="flex items-center">
              <div className="bg-crisis-primary rounded-full p-3 mr-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-800">Emergency Contacts</h1>
                <p className="text-neutral-600">24/7 crisis support and mental health resources</p>
              </div>
            </div>
          </motion.div>

          {/* Emergency Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-crisis-primary text-white rounded-2xl shadow-lg p-6 mb-8"
          >
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 mr-3" />
              <h2 className="text-xl font-bold">Immediate Emergency</h2>
            </div>
            <p className="text-crisis-accent mb-4">
              If you are in immediate danger or having thoughts of suicide, please call 911 or go to your nearest emergency room.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="tel:911"
                className="flex items-center justify-center px-6 py-3 bg-white text-crisis-primary rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call 911
              </a>
              <a
                href="tel:988"
                className="flex items-center justify-center px-6 py-3 bg-crisis-secondary text-white rounded-lg font-semibold hover:bg-crisis-primary transition-colors"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call 988 (Crisis Lifeline)
              </a>
            </div>
          </motion.div>

          {/* Contact Categories */}
          {emergencyContacts.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + categoryIndex * 0.1 }}
              className="bg-white rounded-2xl shadow-soft border border-neutral-200 p-6 mb-6"
            >
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">
                {category.category}
              </h2>
              
              <div className="space-y-4">
                {category.contacts.map((contact, contactIndex) => (
                  <motion.div
                    key={contact.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + categoryIndex * 0.1 + contactIndex * 0.05 }}
                    className="border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 mb-4 lg:mb-0">
                        <h3 className="text-xl font-bold text-neutral-800 mb-2">
                          {contact.name}
                        </h3>
                        <p className="text-neutral-600 mb-3">
                          {contact.description}
                        </p>
                        
                        {contact.languages && (
                          <p className="text-sm text-neutral-500 mb-2">
                            🌍 {contact.languages}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {contact.availableVia.map((method) => (
                            <span
                              key={method}
                              className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full capitalize"
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 lg:ml-6">
                        {contact.number && (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${contact.number}`}
                              className="flex items-center px-4 py-2 bg-crisis-primary text-white rounded-lg font-semibold hover:bg-crisis-secondary transition-colors"
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              {contact.number}
                            </a>
                            <button
                              onClick={() => contact.number && copyToClipboard(contact.number)}
                              className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                              title="Copy number"
                            >
                              {copiedNumber === contact.number ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                        
                        {contact.textMessage && (
                          <div className="text-sm text-neutral-600">
                            <MessageCircle className="w-4 h-4 inline mr-1" />
                            {contact.textMessage}
                          </div>
                        )}
                        
                        {contact.website && (
                          <a
                            href={contact.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary-600 hover:text-primary-700 text-sm transition-colors"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Visit Website
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Local Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-neutral-50 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-primary-500 mr-2" />
              <h2 className="text-xl font-bold text-neutral-800">Find Local Resources</h2>
            </div>
            <p className="text-neutral-600 mb-4">
              For local mental health services, crisis centers, and support groups in your area:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://findtreatment.samhsa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                SAMHSA Treatment Locator
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              <a
                href="https://www.psychologytoday.com/us"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                Psychology Today
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center">
            <Link 
              href="/crisis"
              className="text-primary-600 hover:text-primary-700 transition-colors"
            >
              ← Back to Crisis Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}