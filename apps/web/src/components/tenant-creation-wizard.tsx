import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { FormInput } from './ui/form-input';
import { useCreateTenant, useUploadCertificate, useUpdateSunatCredentials } from '../hooks/use-create-tenant';

interface WizardFormData {
  // Step 1: Basic Data
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  // Step 2: Address
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  // Step 3: Contact
  contactoEmail: string;
  contactoPhone: string;
  // Step 4: SUNAT Credentials
  sunatUsername: string;
  sunatPassword: string;
  // Step 5: Certificate
  certificateFile: File | null;
  certificatePassword: string;
}

const initialFormData: WizardFormData = {
  ruc: '',
  razonSocial: '',
  nombreComercial: '',
  direccion: '',
  departamento: '',
  provincia: '',
  distrito: '',
  ubigeo: '',
  contactoEmail: '',
  contactoPhone: '',
  sunatUsername: '',
  sunatPassword: '',
  certificateFile: null,
  certificatePassword: '',
};

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

function StepIndicator({ currentStep, totalSteps, stepNames }: StepIndicatorProps) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        {stepNames.map((name, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: index + 1 <= currentStep ? '#1976d2' : '#e5e7eb',
                color: index + 1 <= currentStep ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'background-color 0.3s',
              }}
            >
              {index + 1 < currentStep ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                color: index + 1 <= currentStep ? '#374151' : '#9ca3af',
                marginTop: '0.5rem',
                textAlign: 'center',
                maxWidth: '80px',
              }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          height: '4px',
          backgroundColor: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
            backgroundColor: '#1976d2',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
}

// RUC validation (Peruvian RUC algorithm)
function validateRuc(ruc: string): { isValid: boolean; error?: string } {
  if (!ruc) {
    return { isValid: false, error: 'El RUC es requerido' };
  }

  if (!/^[0-9]{11}$/.test(ruc)) {
    return { isValid: false, error: 'El RUC debe tener 11 dígitos' };
  }

  // RUC validation using the official algorithm
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i]) * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  if (checkDigit !== parseInt(ruc[10])) {
    return { isValid: false, error: 'El RUC no es válido (dígito verificador incorrecto)' };
  }

  return { isValid: true };
}

function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSunatUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: 'El usuario SOL es requerido' };
  }
  // Username must be 6-20 alphanumeric characters
  const usernameRegex = /^[A-Za-z0-9]{6,20}$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'El usuario SOL debe tener entre 6 y 20 caracteres alfanuméricos' };
  }
  return { isValid: true };
}

// Step 1: Basic Data
function Step1BasicData({
  data,
  updateData,
}: {
  data: WizardFormData;
  updateData: (field: keyof WizardFormData, value: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const rucValidation = touched ? validateRuc(data.ruc) : { isValid: true };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1.5rem' }}>
        Datos Básicos
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Ingresa la información básica del tenant
      </p>

      <FormInput
        id="ruc"
        name="ruc"
        label="RUC *"
        type="text"
        placeholder="12345678901"
        value={data.ruc}
        onChange={(e) => updateData('ruc', e.target.value)}
        onBlur={() => setTouched(true)}
        error={touched ? rucValidation.error : undefined}
        maxLength={11}
      />

      <FormInput
        id="razonSocial"
        name="razonSocial"
        label="Razón Social *"
        type="text"
        placeholder="Empresa SAC"
        value={data.razonSocial}
        onChange={(e) => updateData('razonSocial', e.target.value)}
        error={!data.razonSocial ? 'La razón social es requerida' : undefined}
      />

      <FormInput
        id="nombreComercial"
        name="nombreComercial"
        label="Nombre Comercial"
        type="text"
        placeholder="Nombre de fantasía (opcional)"
        value={data.nombreComercial}
        onChange={(e) => updateData('nombreComercial', e.target.value)}
      />
    </div>
  );
}

// Step 2: Address
function Step2Address({
  data,
  updateData,
}: {
  data: WizardFormData;
  updateData: (field: keyof WizardFormData, value: string) => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1.5rem' }}>
        Dirección
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Ingresa la dirección fiscal del tenant
      </p>

      <FormInput
        id="direccion"
        name="direccion"
        label="Dirección"
        type="text"
        placeholder="Av. Example 123"
        value={data.direccion}
        onChange={(e) => updateData('direccion', e.target.value)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <FormInput
          id="departamento"
          name="departamento"
          label="Departamento"
          type="text"
          placeholder="Lima"
          value={data.departamento}
          onChange={(e) => updateData('departamento', e.target.value)}
        />
        <FormInput
          id="provincia"
          name="provincia"
          label="Provincia"
          type="text"
          placeholder="Lima"
          value={data.provincia}
          onChange={(e) => updateData('provincia', e.target.value)}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <FormInput
          id="distrito"
          name="distrito"
          label="Distrito"
          type="text"
          placeholder="Miraflores"
          value={data.distrito}
          onChange={(e) => updateData('distrito', e.target.value)}
        />
        <FormInput
          id="ubigeo"
          name="ubigeo"
          label="Ubigeo"
          type="text"
          placeholder="150101"
          value={data.ubigeo}
          onChange={(e) => updateData('ubigeo', e.target.value)}
          maxLength={6}
        />
      </div>
    </div>
  );
}

// Step 3: Contact & SUNAT Credentials
function Step3Contact({
  data,
  updateData,
}: {
  data: WizardFormData;
  updateData: (field: keyof WizardFormData, value: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const usernameValidation = touched ? validateSunatUsername(data.sunatUsername) : { isValid: true };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1.5rem' }}>
        Información de Contacto y SUNAT
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Configura la información de contacto y las credenciales SUNAT
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <FormInput
          id="contactoEmail"
          name="contactoEmail"
          label="Email de Contacto"
          type="email"
          placeholder="contacto@empresa.com"
          value={data.contactoEmail}
          onChange={(e) => updateData('contactoEmail', e.target.value)}
          error={data.contactoEmail && !validateEmail(data.contactoEmail) ? 'Email inválido' : undefined}
        />
        <FormInput
          id="contactoPhone"
          name="contactoPhone"
          label="Teléfono de Contacto"
          type="tel"
          placeholder="+51 999 999 999"
          value={data.contactoPhone}
          onChange={(e) => updateData('contactoPhone', e.target.value)}
        />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
        Credenciales SUNAT (SOL)
      </h3>

      <FormInput
        id="sunatUsername"
        name="sunatUsername"
        label="Usuario SOL *"
        type="text"
        placeholder="USUARIO"
        value={data.sunatUsername}
        onChange={(e) => updateData('sunatUsername', e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        error={touched ? usernameValidation.error : undefined}
      />

      <FormInput
        id="sunatPassword"
        name="sunatPassword"
        label="Contraseña SOL *"
        type="password"
        placeholder="Contraseña de SUNAT"
        value={data.sunatPassword}
        onChange={(e) => updateData('sunatPassword', e.target.value)}
        error={!data.sunatPassword ? 'La contraseña SOL es requerida' : undefined}
      />

      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
        Las credenciales SOL son las que usas para acceder al portal de SUNAT.
      </p>
    </div>
  );
}

// Step 4: Certificate Upload
function Step4Certificate({
  data,
  updateData,
}: {
  data: WizardFormData;
  updateData: (field: keyof WizardFormData, value: string | File | null) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>();

  const handleFileChange = (file: File) => {
    setFileError(undefined);

    if (!file) return;

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pfx' && extension !== 'p12') {
      setFileError('Solo se permiten archivos .pfx o .p12');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('El archivo no debe superar los 10MB');
      return;
    }

    updateData('certificateFile', file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1.5rem' }}>
        Certificado Digital
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Sube el certificado digital (.pfx o .p12) de tu empresa
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#1976d2' : fileError ? '#dc2626' : '#d1d5db'}`,
          borderRadius: '0.5rem',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: dragActive ? '#eff6ff' : '#f9fafb',
          transition: 'all 0.2s',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
        onClick={() => document.getElementById('certificate-input')?.click()}
      >
        <input
          id="certificate-input"
          type="file"
          accept=".pfx,.p12"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
          }}
          style={{ display: 'none' }}
        />

        {data.certificateFile ? (
          <div>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              style={{ margin: '0 auto 1rem' }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p style={{ color: '#374151', fontWeight: 500 }}>{data.certificateFile.name}</p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {(data.certificateFile.size / 1024).toFixed(2)} KB
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateData('certificateFile', null);
              }}
              style={{
                marginTop: '0.5rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Eliminar
            </button>
          </div>
        ) : (
          <div>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ margin: '0 auto 1rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ color: '#374151', fontWeight: 500 }}>
              Arrastra el archivo aquí o <span style={{ color: '#1976d2' }}>haz clic para seleccionar</span>
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Formatos aceptados: .pfx, .p12 (máximo 10MB)
            </p>
          </div>
        )}
      </div>

      {fileError && (
        <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{fileError}</p>
      )}

      <FormInput
        id="certificatePassword"
        name="certificatePassword"
        label="Contraseña del Certificado *"
        type="password"
        placeholder="Contraseña del archivo .pfx"
        value={data.certificatePassword}
        onChange={(e) => updateData('certificatePassword', e.target.value)}
        error={!data.certificatePassword ? 'La contraseña del certificado es requerida' : undefined}
      />

      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
        La contraseña es la misma que usas para abrir el archivo del certificado.
      </p>
    </div>
  );
}

// Step 5: Summary
function Step5Summary({ data }: { data: WizardFormData }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1.5rem' }}>
        Resumen
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Revisa la información antes de crear el tenant
      </p>

      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
          Datos Básicos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#6b7280' }}>RUC:</span>
            <span style={{ color: '#374151', marginLeft: '0.5rem' }}>{data.ruc}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Razón Social:</span>
            <span style={{ color: '#374151', marginLeft: '0.5rem' }}>{data.razonSocial}</span>
          </div>
          {data.nombreComercial && (
            <div>
              <span style={{ color: '#6b7280' }}>Nombre Comercial:</span>
              <span style={{ color: '#374151', marginLeft: '0.5rem' }}>{data.nombreComercial}</span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
          Dirección
        </h3>
        <div style={{ fontSize: '0.875rem', color: '#374151' }}>
          {data.direccion || 'No especificada'}
          {data.distrito && (
            <span>, {data.distrito}, {data.provincia}, {data.departamento}</span>
          )}
          {data.ubigeo && (
            <span style={{ color: '#6b7280' }}> (Ubigeo: {data.ubigeo})</span>
          )}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
          Contacto
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#6b7280' }}>Email:</span>
            <span style={{ color: '#374151', marginLeft: '0.5rem' }}>{data.contactoEmail || '-'}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Teléfono:</span>
            <span style={{ color: '#374151', marginLeft: '0.5rem' }}>{data.contactoPhone || '-'}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
          Credenciales SUNAT
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#6b7280' }}>Usuario SOL:</span>
            <span style={{ color: '#374151', marginLeft: '0.5rem' }}>{data.sunatUsername}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Contraseña:</span>
            <span style={{ color: '#374151', marginLeft: '0.5rem' }}>••••••••</span>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>
          Certificado Digital
        </h3>
        <div style={{ fontSize: '0.875rem' }}>
          <span style={{ color: '#6b7280' }}>Archivo:</span>
          <span style={{ color: '#374151', marginLeft: '0.5rem' }}>
            {data.certificateFile?.name || 'No seleccionado'}
          </span>
        </div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          <span style={{ color: '#6b7280' }}>Contraseña:</span>
          <span style={{ color: '#374151', marginLeft: '0.5rem' }}>
            {data.certificatePassword ? '••••••••' : 'No especificada'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Success Screen
function SuccessScreen({ tenantRuc }: { tenantRuc: string }) {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        ¡Tenant creado exitosamente!
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
        El tenant con RUC {tenantRuc} ha sido creado correctamente.
      </p>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Ahora puedes configurar series y comenzar a emitir comprobantes.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/tenants')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Ver Tenants
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Ir al Dashboard
        </button>
      </div>
    </div>
  );
}

// Main Wizard Component
export function TenantCreationWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const createTenant = useCreateTenant();
  const uploadCertificate = useUploadCertificate();
  const updateSunatCredentials = useUpdateSunatCredentials();

  const totalSteps = 5;
  const stepNames = ['Datos', 'Dirección', 'SUNAT', 'Certificado', 'Resumen'];

  const updateData = (field: keyof WizardFormData, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: {
        const rucValidation = validateRuc(formData.ruc);
        if (!formData.razonSocial) return false;
        return rucValidation.isValid;
      }
      case 2:
        return true; // Address is optional
      case 3: {
        const usernameValidation = validateSunatUsername(formData.sunatUsername);
        return usernameValidation.isValid && !!formData.sunatPassword && validateEmail(formData.contactoEmail);
      }
      case 4:
        return !!formData.certificateFile && !!formData.certificatePassword;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setGlobalError(null);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setGlobalError(null);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:application/x-pkcs12;base64,")
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async () => {
    setGlobalError(null);

    try {
      // Step 1: Create tenant
      const tenantResponse = await createTenant.mutateAsync({
        ruc: formData.ruc,
        razonSocial: formData.razonSocial,
        nombreComercial: formData.nombreComercial || undefined,
        direccion: {
          direccion: formData.direccion || undefined,
          departamento: formData.departamento || undefined,
          provincia: formData.provincia || undefined,
          distrito: formData.distrito || undefined,
          ubigeo: formData.ubigeo || undefined,
        },
        contactoEmail: formData.contactoEmail || undefined,
        contactoPhone: formData.contactoPhone || undefined,
      });

      const tenantId = tenantResponse.id;

      // Step 2: Upload certificate
      if (formData.certificateFile) {
        const certificateBase64 = await convertFileToBase64(formData.certificateFile);
        await uploadCertificate.mutateAsync({
          tenantId,
          certificate: certificateBase64,
          password: formData.certificatePassword,
        });
      }

      // Step 3: Update SUNAT credentials
      await updateSunatCredentials.mutateAsync({
        tenantId,
        username: formData.sunatUsername,
        password: formData.sunatPassword,
      });

      setSuccess(true);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Error al crear el tenant');
    }
  };

  const isLoading = createTenant.isPending || uploadCertificate.isPending || updateSunatCredentials.isPending;

  if (success) {
    return <SuccessScreen tenantRuc={formData.ruc} />;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/tenants')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            marginBottom: '0.5rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a Tenants
        </button>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '0.25rem',
          }}
        >
          Crear Nuevo Tenant
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Completa los pasos para crear un nuevo tenant en el sistema
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={totalSteps} stepNames={stepNames} />

      {/* Form Card */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}
      >
        {/* Step Content */}
        <div style={{ minHeight: '300px' }}>
          {currentStep === 1 && <Step1BasicData data={formData} updateData={updateData} />}
          {currentStep === 2 && <Step2Address data={formData} updateData={updateData} />}
          {currentStep === 3 && <Step3Contact data={formData} updateData={updateData} />}
          {currentStep === 4 && <Step4Certificate data={formData} updateData={updateData} />}
          {currentStep === 5 && <Step5Summary data={formData} />}
        </div>

        {/* Global Error */}
        {globalError && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {globalError}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentStep === 1 ? '#f3f4f6' : 'white',
              color: currentStep === 1 ? '#9ca3af' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Anterior
            </span>
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!validateCurrentStep()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: validateCurrentStep() ? '#1976d2' : '#93c5fd',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: 500,
                cursor: validateCurrentStep() ? 'pointer' : 'not-allowed',
              }}
            >
              Siguiente
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isLoading ? '#93c5fd' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Creando...
                </span>
              ) : (
                'Crear Tenant'
              )}
            </button>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
