export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">상품 상세</h1>
      <p className="text-gray-600">상품: {params.slug}</p>
    </div>
  );
}
