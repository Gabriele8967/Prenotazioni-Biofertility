"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { validateFiscalCode, checkFiscalCodeCoherence, formatFiscalCode } from "@/lib/fiscal-code-validator";

interface FiscalCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  birthDate?: string;
  required?: boolean;
  label?: string;
}

export function FiscalCodeInput({
  value,
  onChange,
  birthDate,
  required = true,
  label = "Codice Fiscale"
}: FiscalCodeInputProps) {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message: string;
    type: 'error' | 'warning' | 'success' | 'info' | null;
  }>({ isValid: true, message: '', type: null });

  useEffect(() => {
    if (!value || value.length === 0) {
      setValidationState({ isValid: true, message: '', type: null });
      return;
    }

    const formatted = formatFiscalCode(value);

    // Validazione formale
    const validation = validateFiscalCode(formatted);

    if (!validation.isValid) {
      setValidationState({
        isValid: false,
        message: validation.errors[0],
        type: 'error'
      });
      return;
    }

    // Controllo coerenza con data di nascita
    if (birthDate) {
      const coherence = checkFiscalCodeCoherence(formatted, birthDate);

      if (!coherence.isCoherent) {
        setValidationState({
          isValid: false,
          message: coherence.issues[0],
          type: 'error'
        });
        return;
      }
    }

    // Tutto OK
    setValidationState({
      isValid: true,
      message: 'Codice fiscale valido',
      type: 'success'
    });

  }, [value, birthDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().replace(/\s/g, '');
    onChange(newValue);
  };

  const getIcon = () => {
    switch (validationState.type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getMessageColor = () => {
    switch (validationState.type) {
      case 'error':
        return 'text-red-600';
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBorderColor = () => {
    switch (validationState.type) {
      case 'error':
        return 'border-red-500 focus:border-red-500';
      case 'success':
        return 'border-green-500 focus:border-green-500';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="fiscalCode">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          id="fiscalCode"
          value={value}
          onChange={handleChange}
          placeholder="RSSMRA80A01H501U"
          maxLength={16}
          required={required}
          className={`pr-10 uppercase ${getBorderColor()}`}
        />
        {validationState.type && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getIcon()}
          </div>
        )}
      </div>
      {validationState.message && (
        <div className={`flex items-start gap-2 text-sm ${getMessageColor()}`}>
          {getIcon()}
          <span>{validationState.message}</span>
        </div>
      )}
      {!birthDate && value.length === 0 && (
        <p className="text-xs text-gray-500">
          Il codice fiscale verrà verificato automaticamente con la data di nascita
        </p>
      )}
    </div>
  );
}
