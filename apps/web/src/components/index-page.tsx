import { Link } from 'react-router';

export function IndexPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8">
      <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl mb-6">
        F
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Facturin</h1>
      <p className="text-gray-500 mb-8 text-center">Sistema de Facturación Electrónica SUNAT</p>
      <nav>
        <ul className="flex gap-4 list-none p-0">
          <li>
            <Link
              to="/login"
              className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors no-underline"
            >
              Iniciar Sesión
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}