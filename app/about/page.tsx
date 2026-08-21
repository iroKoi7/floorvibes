import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Headphones,
  Heart,
  ListMusic,
  MessageCircle,
  QrCode,
  Radio,
  Search,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/app/about/contact-form";
import { BrandLockup } from "@/components/brand-lockup";

const features = [
  {
    icon: Search,
    title: "Song search",
    body: "参加者はアプリ内で曲を検索して、その場でリクエストできます。",
  },
  {
    icon: Radio,
    title: "Realtime DJ dashboard",
    body: "DJはフロアが今求めている音楽をプレイ中いつでも把握できます。",
  },
  {
    icon: ListMusic,
    title: "Request grouping",
    body: "同じ曲のリクエストをまとめて、フロアの熱量を見やすくします。",
  },
  {
    icon: CalendarClock,
    title: "DJ timeline",
    body: "時間帯ごとの担当DJを設定し、現在ターンを自動で反映できます。",
  },
  {
    icon: Heart,
    title: "After-event likes",
    body: "イベント終了後にDJへLikeを送り、イベントの余韻を集められます。",
  },
  {
    icon: BarChart3,
    title: "Event reports",
    body: "イベント全体のリクエストや対応状況をOwner Consoleから振り返れます。",
  },
];

const steps = [
  {
    title: "Create",
    body: "Owner Consoleでイベント、DJ、タイムライン、終了メッセージを設定します。",
  },
  {
    title: "Share",
    body: "Audience / DJリンクを共有し、QRコードからすぐ参加できる導線を作ります。",
  },
  {
    title: "Request",
    body: "参加者はログインなしで名前を入れ、曲を検索してリクエストします。",
  },
  {
    title: "Play",
    body: "DJはフロアの温度を見ながら、今求められている曲をプレイに反映できます。",
  },
  {
    title: "Review",
    body: "終了後は履歴から、参加者の好きな音楽や次にディグる曲を振り返れます。",
  },
];

const audiences = [
  {
    title: "Audience",
    body: "ログインなしで、スマホからすぐ曲をリクエスト。",
    icon: Smartphone,
  },
  {
    title: "DJ",
    body: "フロアが今求めている音楽を見ながらプレイ。",
    icon: Headphones,
  },
  {
    title: "Owner",
    body: "イベント、DJ、タイムライン、終了画面を管理。",
    icon: QrCode,
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <section className="relative min-h-[82vh] px-4 py-5 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(251,90,184,0.28),transparent_24rem),radial-gradient(circle_at_76%_12%,rgba(56,223,255,0.2),transparent_22rem),linear-gradient(180deg,#0b0614_0%,#05030a_100%)]" />
          <div className="absolute left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.03] shadow-[0_0_80px_rgba(236,72,153,0.16)]" />
          <div className="absolute bottom-16 left-1/2 grid w-[min(92vw,820px)] -translate-x-1/2 grid-cols-10 items-end gap-2 opacity-75">
            {[32, 72, 44, 92, 56, 82, 38, 68, 48, 76].map((height, index) => (
              <span
                className="rounded-t bg-[linear-gradient(180deg,#38dfff,#fb5ab8)]"
                key={index}
                style={{ height }}
              />
            ))}
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl items-center justify-between py-3">
          <Link className="flex items-center gap-2 text-lg font-black text-white" href="/about">
            <BrandLockup />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-pink-300/25 bg-pink-300/10 px-3 text-sm font-bold text-pink-50 transition hover:bg-pink-300/16"
              href="/admin"
            >
              Owner Console
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-3 text-sm font-bold text-cyan-50 transition hover:bg-cyan-200/16"
              href="#contact"
            >
              Contact
            </Link>
          </div>
        </nav>

        <div className="mx-auto flex max-w-4xl flex-col items-center pt-20 text-center sm:pt-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-pink-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Real-time DJ request app
          </div>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-7xl">
            フロアの声を、
            <span className="block text-cyan-100">DJにリアルタイムで。</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-slate-300 sm:text-lg">
            FloorVibesは、イベント参加者がスマホから曲をリクエストし、DJがリアルタイムで受け取れる軽量なWebアプリです。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#fb5ab8_0%,#38dfff_52%,#a855f7_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_0_34px_rgba(236,72,153,0.28)] transition hover:brightness-110"
              href="/admin/create"
            >
              イベントを作成する
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-5 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-200/16"
              href="/e/floorvibes"
            >
              デモを見る
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/12 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
              href="#how-it-works"
            >
              使い方
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {audiences.map(({ title, body, icon: Icon }) => (
            <Card className="p-5" key={title}>
              <Icon className="h-7 w-7 text-cyan-100" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-200">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            イベント当日の流れを、シンプルに。
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-5">
            {steps.map((step, index) => (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4" key={step.title}>
                <p className="flex h-8 w-8 items-center justify-center rounded-full border border-pink-300/25 bg-pink-300/10 text-sm font-black text-pink-100">
                  {index + 1}
                </p>
                <h3 className="mt-4 text-lg font-black text-white">{step.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            小規模イベントに欲しい機能を、軽く速く。
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card className="p-5" key={feature.title}>
                <feature.icon className="h-6 w-6 text-pink-100" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-black text-white">{feature.title}</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{feature.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] p-6 sm:p-8">
          <MessageCircle className="mx-auto h-8 w-8 text-cyan-100" aria-hidden="true" />
          <h2 className="mt-4 text-center text-3xl font-black text-white">Contact</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm font-bold leading-7 text-slate-300">
            FloorVibesはベータ版として開発中です。イベントで使ってみたい方、DJ/主催者として試したい方、共同検証や質問がある方は気軽にご連絡ください。
          </p>
          <ContactForm />
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#fb5ab8_0%,#38dfff_52%,#a855f7_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(236,72,153,0.22)] transition hover:brightness-110"
              href="/admin/create"
            >
              イベントを作成する
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/12 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10 hover:text-white"
              href="/"
            >
              Audience UIを見る
            </Link>
          </div>
          <p className="mt-4 text-center text-xs font-bold text-slate-500">
            送信内容は開発者がSupabaseで確認します。メール通知は次のステップで接続予定です。
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs font-bold text-slate-500 sm:px-6 lg:px-8">
        FloorVibes beta
      </footer>
    </main>
  );
}
