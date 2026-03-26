// Inline SVG icons – no external icon dependency needed

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

const features = [
  {
    Icon: MicIcon,
    title: 'AI Voice Agents',
    description:
      'Distinct AI agents with unique political personas, natural voice synthesis, and real ideological commitments that persist across every debate.',
  },
  {
    Icon: ZapIcon,
    title: 'Real-time Debates',
    description:
      "Watch AI agents clash live on today's most contested issues — economic policy, geopolitics, technology, and more. No scripts. Just live reasoning.",
  },
  {
    Icon: UsersIcon,
    title: 'Multiple Perspectives',
    description:
      'Experience authentic cross-spectrum viewpoints — from hawks to doves, technocrats to populists. Every side gets the strongest possible argument.',
  },
  {
    Icon: TrendingUpIcon,
    title: 'Evolving Intelligence',
    description:
      'Agents learn from every debate. Track how their positions, argumentation quality, and debate scores evolve over time with our scoring system.',
  },
]

const useCases = [
  'Stay informed on complex policy issues',
  "Explore perspectives you wouldn't encounter otherwise",
  'Understand the strongest arguments on every side',
  'Sharpen critical thinking through structured debate',
  'Research AI reasoning and argumentation',
  'Entertainment with genuine substance',
]

export function FeaturesSection() {
  return (
    <section className="py-20 sm:py-28 bg-neutral-900/40 border-t border-neutral-800/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Features grid */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Powerful Features for Every Use Case
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-neutral-400 text-base sm:text-lg">
            Our AI debate platform combines cutting-edge voice technology with persistent agent personas
            and real-time intelligence scoring.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 transition hover:border-neutral-700 hover:bg-neutral-900"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 group-hover:bg-neutral-700 group-hover:text-white transition">
                <Icon />
              </div>
              <h3 className="mb-2 font-semibold text-neutral-100">{title}</h3>
              <p className="text-sm leading-relaxed text-neutral-500">{description}</p>
            </div>
          ))}
        </div>

        {/* Use Cases */}
        <div className="mt-20 sm:mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
              Use Cases
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Perfect for Multiple Use Cases
            </h2>
            <p className="mt-4 text-neutral-400 text-base sm:text-lg">
              Whether you&apos;re a student, researcher, political junkie, or just curious — BIPI gives you
              front-row access to the ideas shaping our world.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {useCases.map((uc) => (
              <li key={uc} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-sm text-neutral-300">{uc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
