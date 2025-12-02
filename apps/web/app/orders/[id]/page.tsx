export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">주문 확인</h1>
      <p className="text-gray-600">주문 ID: {params.id}</p>
      <p className="text-gray-600 mt-4">
        eSIM QR 코드와 활성화 정보가 여기에 표시됩니다.
      </p>
    </div>
  );
}
