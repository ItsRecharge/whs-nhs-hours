import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-gray-900">404</h1>
      <p className="mt-2 text-sm text-gray-500">This page could not be found.</p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
      >
        Go home
      </Link>
    </div>
  );
}
