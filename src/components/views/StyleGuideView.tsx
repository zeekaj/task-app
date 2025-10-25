// Style Guide View - Momentum Brand Typography & Design System

interface StyleGuideViewProps {
  uid: string;
}

export function StyleGuideView({ uid: _uid }: StyleGuideViewProps) {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-br from-brand-cyan/10 to-brand-violet/10 rounded-3xl border border-white/10">
        <h1 className="type-display type-glow mb-4">Momentum OS</h1>
        <p className="type-h4 text-brand-text/80 font-outfit font-extrabold tracking-wide">
          Where ideas gain speed
        </p>
        <p className="type-caption text-brand-text/60 mt-4">
          Inter (Primary) • Manrope (Secondary) • Outfit (Accent)
        </p>
      </section>

      {/* Typography Section */}
      <section>
        <h2 className="type-h2 mb-8 pb-4 border-b border-white/10">Typography System</h2>
        
        <div className="space-y-8">
          {/* Headings */}
          <div>
            <h3 className="type-h4 text-brand-cyan mb-4">Headings (Inter)</h3>
            <div className="space-y-4 bg-white/5 p-6 rounded-2xl">
              <div>
                <h1 className="type-display">Display - Inter ExtraBold</h1>
                <code className="type-caption text-gray-500">.type-display • 48px • 800 weight</code>
              </div>
              <div>
                <h1 className="type-h1">Heading 1 - Dashboard Title</h1>
                <code className="type-caption text-gray-500">.type-h1 • 36px • 800 weight</code>
              </div>
              <div>
                <h2 className="type-h2">Heading 2 - Section Title</h2>
                <code className="type-caption text-gray-500">.type-h2 • 30px • 600 weight</code>
              </div>
              <div>
                <h3 className="type-h3">Heading 3 - Card Heading</h3>
                <code className="type-caption text-gray-500">.type-h3 • 24px • 600 weight</code>
              </div>
              <div>
                <h4 className="type-h4">Heading 4 - Subsection</h4>
                <code className="type-caption text-gray-500">.type-h4 • 20px • 600 weight</code>
              </div>
              <div>
                <h5 className="type-h5">Heading 5 - Component Title</h5>
                <code className="type-caption text-gray-500">.type-h5 • 18px • 600 weight</code>
              </div>
              <div>
                <h6 className="type-h6">Heading 6 - Small Header</h6>
                <code className="type-caption text-gray-500">.type-h6 • 16px • 500 weight</code>
              </div>
            </div>
          </div>

          {/* Body Text */}
          <div>
            <h3 className="type-h4 text-brand-violet mb-4">Body Text (Inter)</h3>
            <div className="space-y-4 bg-white/5 p-6 rounded-2xl">
              <div>
                <p className="type-body-lg">
                  Large body text - Perfect for introductions and key paragraphs that need emphasis.
                </p>
                <code className="type-caption text-gray-500">.type-body-lg • 18px • 400 weight</code>
              </div>
              <div>
                <p className="type-body">
                  Regular body text - The default for most content. Readable and comfortable for extended reading.
                </p>
                <code className="type-caption text-gray-500">.type-body • 16px • 400 weight</code>
              </div>
              <div>
                <p className="type-body-sm">
                  Small body text - Used for secondary information and less prominent content areas.
                </p>
                <code className="type-caption text-gray-500">.type-body-sm • 14px • 400 weight</code>
              </div>
              <div>
                <p className="type-caption">
                  Caption text - Manrope font for UI labels, timestamps, and metadata.
                </p>
                <code className="type-caption text-gray-500">.type-caption • 12px • 500 weight • Manrope</code>
              </div>
            </div>
          </div>

          {/* UI Labels & Metrics */}
          <div>
            <h3 className="type-h4 text-brand-success mb-4">UI Components (Manrope)</h3>
            <div className="grid grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl">
              <div>
                <div className="type-metric text-5xl text-brand-cyan mb-2">42</div>
                <div className="type-label text-gray-400">Active Tasks</div>
                <code className="type-caption text-gray-500">.type-metric • Manrope SemiBold</code>
              </div>
              <div>
                <div className="type-metric text-5xl text-brand-violet mb-2">87%</div>
                <div className="type-label text-gray-400">Completion Rate</div>
                <code className="type-caption text-gray-500">.type-label • Manrope Medium</code>
              </div>
            </div>
          </div>

          {/* Glow Effect */}
          <div>
            <h3 className="type-h4 text-brand-warning mb-4">Special Effects</h3>
            <div className="bg-black/60 p-8 rounded-2xl text-center">
              <h2 className="type-h1 type-glow mb-4">Momentum</h2>
              <p className="type-body text-brand-text/80">
                Add <code className="px-2 py-1 bg-white/10 rounded">.type-glow</code> for neon glow effect
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Colors */}
      <section>
        <h2 className="type-h2 mb-8 pb-4 border-b border-white/10">Brand Colors</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-brand-cyan rounded-2xl p-6 text-black">
            <div className="type-h4 mb-2">Cyan</div>
            <code className="type-caption">#00D0FF</code>
            <div className="type-caption mt-2 opacity-80">Primary accent</div>
          </div>
          
          <div className="bg-brand-violet rounded-2xl p-6 text-white">
            <div className="type-h4 mb-2">Violet</div>
            <code className="type-caption">#A38BFF</code>
            <div className="type-caption mt-2 opacity-80">Secondary accent</div>
          </div>
          
          <div className="bg-brand-success rounded-2xl p-6 text-black">
            <div className="type-h4 mb-2">Success</div>
            <code className="type-caption">#19E68C</code>
            <div className="type-caption mt-2 opacity-80">Positive actions</div>
          </div>
          
          <div className="bg-brand-warning rounded-2xl p-6 text-black">
            <div className="type-h4 mb-2">Warning</div>
            <code className="type-caption">#FFA84A</code>
            <div className="type-caption mt-2 opacity-80">Alerts</div>
          </div>
          
          <div className="bg-brand-text rounded-2xl p-6 text-black">
            <div className="type-h4 mb-2">Text</div>
            <code className="type-caption">#EAEAEA</code>
            <div className="type-caption mt-2 opacity-80">Base text color</div>
          </div>
          
          <div className="bg-brand-bg border border-white/10 rounded-2xl p-6 text-white">
            <div className="type-h4 mb-2">Background</div>
            <code className="type-caption">#0B0B0D</code>
            <div className="type-caption mt-2 opacity-80">Base background</div>
          </div>
        </div>
      </section>

      {/* Components */}
      <section>
        <h2 className="type-h2 mb-8 pb-4 border-b border-white/10">UI Components</h2>
        
        <div className="space-y-6">
          {/* Buttons */}
          <div>
            <h3 className="type-h4 mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-blue-500 text-white font-manrope font-semibold rounded-full shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] transition-all">
                Primary Button
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-brand-violet to-purple-600 text-white font-manrope font-semibold rounded-full shadow-[0_0_20px_rgba(163,139,255,0.4)] hover:shadow-[0_0_30px_rgba(163,139,255,0.6)] transition-all">
                Secondary Button
              </button>
              <button className="px-6 py-3 bg-white/10 text-white font-manrope font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all">
                Ghost Button
              </button>
            </div>
          </div>

          {/* Cards */}
          <div>
            <h3 className="type-h4 mb-4">Cards</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <h4 className="type-h3 mb-3 text-brand-cyan">Project Alpha</h4>
                <p className="type-body text-brand-text/80 mb-4">
                  A glass morphism card with gradient background and subtle glow effects.
                </p>
                <div className="flex items-center gap-4">
                  <span className="type-caption bg-brand-cyan/20 text-brand-cyan px-3 py-1 rounded-full">In Progress</span>
                  <span className="type-caption text-gray-400">Due: Tomorrow</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-brand-violet/10 to-brand-cyan/10 border border-brand-violet/30 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_30px_rgba(163,139,255,0.2)]">
                <h4 className="type-h3 mb-3 text-brand-violet">Featured Task</h4>
                <p className="type-body text-brand-text/80 mb-4">
                  Enhanced card with brand colors and neon glow for important items.
                </p>
                <div className="flex items-center gap-4">
                  <span className="type-caption bg-brand-violet/20 text-brand-violet px-3 py-1 rounded-full">Priority</span>
                  <span className="type-caption text-gray-400">Assigned to You</span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h3 className="type-h4 mb-4">Status Badges</h3>
            <div className="flex flex-wrap gap-3">
              <span className="type-caption font-semibold bg-brand-cyan/20 text-brand-cyan px-4 py-2 rounded-full border border-brand-cyan/30">Active</span>
              <span className="type-caption font-semibold bg-brand-violet/20 text-brand-violet px-4 py-2 rounded-full border border-brand-violet/30">In Review</span>
              <span className="type-caption font-semibold bg-brand-success/20 text-brand-success px-4 py-2 rounded-full border border-brand-success/30">Completed</span>
              <span className="type-caption font-semibold bg-brand-warning/20 text-brand-warning px-4 py-2 rounded-full border border-brand-warning/30">Pending</span>
              <span className="type-caption font-semibold bg-red-500/20 text-red-400 px-4 py-2 rounded-full border border-red-500/30">Blocked</span>
            </div>
          </div>
        </div>
      </section>

      {/* Font Families Demo */}
      <section>
        <h2 className="type-h2 mb-8 pb-4 border-b border-white/10">Font Families</h2>
        
        <div className="space-y-6">
          <div className="bg-white/5 p-6 rounded-2xl">
            <h3 className="type-h4 mb-3 font-inter">Inter (Primary)</h3>
            <p className="type-body font-inter mb-2">
              Use for: Headers, body text, and primary content.
            </p>
            <p className="type-body-sm font-inter text-gray-400">
              Purpose-built for digital interfaces. Clean and highly readable at all sizes.
            </p>
          </div>
          
          <div className="bg-white/5 p-6 rounded-2xl">
            <h3 className="type-h4 mb-3 font-manrope">Manrope (Secondary)</h3>
            <p className="type-body font-manrope mb-2">
              Use for: UI labels, metrics, captions, navigation, tooltips.
            </p>
            <p className="type-body-sm font-manrope text-gray-400">
              Rounded geometry complements your logo's curves. Futuristic but readable at small sizes.
            </p>
          </div>
          
          <div className="bg-white/5 p-6 rounded-2xl">
            <h3 className="type-h4 mb-3 font-outfit">Outfit (Accent)</h3>
            <p className="type-body font-outfit mb-2 font-extrabold tracking-wide">
              Use for: Marketing headers, splash screens, loading animations.
            </p>
            <p className="type-body-sm font-outfit text-gray-400">
              Strong vertical motion and futuristic curves — matches the Momentum "energy arc" feel.
            </p>
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section>
        <h2 className="type-h2 mb-8 pb-4 border-b border-white/10">Real-World Examples</h2>
        
        <div className="space-y-8">
          {/* Dashboard Card Example */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="type-h2 mb-2">Team Dashboard</h3>
                <p className="type-body text-gray-400">Overview of current sprint progress</p>
              </div>
              <span className="type-caption bg-brand-success/20 text-brand-success px-3 py-1.5 rounded-full font-semibold">On Track</span>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="type-metric text-4xl text-brand-cyan mb-1">24</div>
                <div className="type-label text-gray-400">Tasks Active</div>
              </div>
              <div className="text-center">
                <div className="type-metric text-4xl text-brand-success mb-1">18</div>
                <div className="type-label text-gray-400">Completed</div>
              </div>
              <div className="text-center">
                <div className="type-metric text-4xl text-brand-warning mb-1">3</div>
                <div className="type-label text-gray-400">Blocked</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-blue-500 text-white font-manrope font-semibold rounded-lg shadow-[0_0_15px_rgba(0,217,255,0.3)]">
                View Details
              </button>
              <button className="px-4 py-2.5 bg-white/10 text-white font-manrope font-semibold rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                Export
              </button>
            </div>
          </div>

          {/* Task List Example */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="type-h3 mb-4">Today's Tasks</h3>
            <div className="space-y-3">
              {[
                { title: 'Review design mockups', status: 'In Progress', priority: 'High', color: 'cyan' },
                { title: 'Update API documentation', status: 'Todo', priority: 'Medium', color: 'violet' },
                { title: 'Team standup meeting', status: 'Completed', priority: 'Low', color: 'success' }
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-all">
                  <div className="flex-1">
                    <h4 className="type-body font-semibold mb-1">{task.title}</h4>
                    <div className="flex items-center gap-3">
                      <span className={`type-caption bg-brand-${task.color}/20 text-brand-${task.color} px-2 py-0.5 rounded`}>
                        {task.status}
                      </span>
                      <span className="type-caption text-gray-500">{task.priority} Priority</span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="text-center py-8 border-t border-white/10">
        <p className="type-body text-gray-400 mb-2">
          Momentum Brand Typography System
        </p>
        <p className="type-caption text-gray-500">
          Manrope • Inter • Outfit
        </p>
      </section>
    </div>
  );
}
