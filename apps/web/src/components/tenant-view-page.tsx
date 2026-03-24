import { useParams } from 'react-router';

export function TenantViewPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1>Tenant View</h1>
      <p>Viewing tenant: {id}</p>
    </div>
  );
}
