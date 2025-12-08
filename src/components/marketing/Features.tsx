const facts = [
  "We automate the creation and publishing of your repeatable posts",
  "We use your images, videos, brand tone and website detail - nothing random",
  "And you stay fully in control: edit, approve, or skip any post"
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="container">
        
        {/* Section 1: Founder's Quote */}
        <div className="max-w-4xl mx-auto mb-32">
          <div className="relative bg-blue-50/50 p-8 md:p-12 rounded-3xl border border-blue-100">
            <div className="relative z-10 pt-6">
              <p className="text-xl md:text-2xl text-slate-700 italic mb-10 leading-relaxed font-medium">
                "I've spent years helping brands with marketing, and one thing kept standing out: not every post needs to be a masterpiece.
                <br /><br />
                Most SMBs rely on simple, repeatable posts - product highlights, promos, event reminders - and they make up about 80% of content. So I built Ferdy to automate this process."
              </p>
              <div className="flex items-center gap-4">
                <img src="/images/Andrew-cropped.jpg" alt="Andrew Ferdinando" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
                <div>
                  <p className="font-bold text-slate-900 text-lg">Andrew Ferdinando</p>
                  <p className="text-sm text-slate-500">Founder of Ferdy</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Value Props */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Bullet Points */}
          <div className="flex flex-col justify-center">
            <div className="space-y-8 mb-10">
              {facts.map((fact, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="mt-1 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xl md:text-2xl text-gray-800 font-medium leading-snug">{fact}</span>
                </div>
              ))}
            </div>
            <div className="pl-4 border-l-4 border-blue-600/30 py-2">
              <p className="text-xl md:text-2xl font-semibold text-blue-600">
                Ferdy doesn't replace your creativity — it frees you up to use it where it matters.
              </p>
            </div>
          </div>

          {/* Right: Product Demo Placeholder */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-[2rem] blur-2xl opacity-60"></div>
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white bg-white aspect-video flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
