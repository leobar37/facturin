import { useParams } from 'react-router';

export function TenantEditPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1>Tenant Edit</h1>
      <p>Editing tenant: {id}</p>
    </div>
  );
}
