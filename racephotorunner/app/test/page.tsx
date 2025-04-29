export default function TestPage() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-blue-500 mb-4">Tailwind Test Page</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-500 text-white p-4 rounded">Red Box</div>
        <div className="bg-blue-500 text-white p-4 rounded">Blue Box</div>
        <div className="bg-green-500 text-white p-4 rounded">Green Box</div>
        <div className="bg-yellow-500 text-black p-4 rounded">Yellow Box</div>
      </div>
      
      <div className="mt-8 p-6 bg-white shadow-lg rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Test Card</h2>
        <p className="text-gray-600">This is a test card with basic Tailwind styling.</p>
      </div>
    </div>
  );
} 