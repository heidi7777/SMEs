import Room from "@/components/Room";

export default function MarketingPage() {
  return (
    <Room
      moduleKey="marketing"
      title="营销工坊"
      emptyHint="试试输入：产品/目标人群/渠道/预算/要交付的内容（PPT大纲/卖点清单/种草文案），我会先按 STP 定位再输出可用文本。"
    />
  );
}

