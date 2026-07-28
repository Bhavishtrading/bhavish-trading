export default function OILeaders({ data }) {
  const leaders = data?.oiLeaders;

  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <h2 className="text-lg font-bold mb-4">
        🏆 OI Leaders
      </h2>

      <div className="space-y-4">
        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-500">
            Highest Call Writing
          </div>

          <div className="text-xl font-bold text-red-600">
            {leaders?.callWriting?.strike ?? "-"}
          </div>

          <div className="text-sm">
            OI :
            {" "}
            {leaders?.callWriting?.oi?.toLocaleString() ?? "-"}
          </div>

          <div className="text-sm">
            Volume :
            {" "}
            {leaders?.callWriting?.volume?.toLocaleString() ?? "-"}
          </div>
        </div>

        <div className="border rounded-lg p-3">
          <div className="text-sm text-gray-500">
            Highest Put Writing
          </div>

          <div className="text-xl font-bold text-green-600">
            {leaders?.putWriting?.strike ?? "-"}
          </div>

          <div className="text-sm">
            OI :
            {" "}
            {leaders?.putWriting?.oi?.toLocaleString() ?? "-"}
          </div>

          <div className="text-sm">
            Volume :
            {" "}
            {leaders?.putWriting?.volume?.toLocaleString() ?? "-"}
          </div>
        </div>
      </div>
    </div>
  );
}