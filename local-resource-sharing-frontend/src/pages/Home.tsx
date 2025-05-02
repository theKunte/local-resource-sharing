function Home() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Available Resources</h1>
      {/* Test with dummy content */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 bg-white rounded shadow">Resource 1</div>
        <div className="p-4 bg-white rounded shadow">Resource 2</div>
      </div>
    </div>
  );
}

export default Home;
