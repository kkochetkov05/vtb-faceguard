import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <p className="text-gray-500">Страница не найдена</p>
      <Link to="/" className="vtb-btn-primary">
        На главную
      </Link>
    </div>
  );
}
