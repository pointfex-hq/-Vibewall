import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl font-bold">404 - Not Found</h1>
      <p className="mt-2 text-gray-500">The page you are looking for does not exist.</p>
      <Link href="/" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
        Return Home
      </Link>
    </div>
  );
}
