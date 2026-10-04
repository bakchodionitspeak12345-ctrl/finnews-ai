import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpenText,
  Check,
  Clock3,
  LoaderCircle,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  getGetNewsQueryKey,
  useGetNews,
  useSimplifyArticle,
} from '@workspace/api-client-react';
import type { NewsArticle } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const categories = ['All', 'Stock Market', 'Economy', 'Business', 'Banking', 'Technology'] as const;
type Category = (typeof categories)[number];

function formatPublishedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently';
  const age = Date.now() - parsed.getTime();
  if (age >= 0 && age < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(age / 60_000));
    return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  }
  if (age >= 0 && age < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(age / (60 * 60 * 1000)));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StoryCard({ article, index }: { article: NewsArticle; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const simplify = useSimplifyArticle();
  const explanation = simplify.data;
  const isWorking = simplify.isPending;

  function handleExplain() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (!explanation && !isWorking) {
      simplify.mutate({
        data: {
          title: article.title,
          source: article.source,
          description: article.description,
          content: article.content,
        },
      });
    }
  }

  function retryExplain() {
    simplify.reset();
    simplify.mutate({
      data: {
        title: article.title,
        source: article.source,
        description: article.description,
        content: article.content,
      },
    });
  }

  return (
    <article className="story-card" data-testid={`card-story-${article.id}`} style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <div className="story-layout">
        <div>
          <div className="story-meta">
            <span className="category-tag" data-testid={`text-category-${article.id}`}>{article.category}</span>
            <span className="story-source" data-testid={`text-source-${article.id}`}>{article.source}</span>
            <span className="meta-divider" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5" data-testid={`text-published-${article.id}`}>
              <Clock3 size={12} aria-hidden="true" /> {formatPublishedAt(article.publishedAt)}
            </span>
          </div>
          <h2 className="story-title" data-testid={`text-title-${article.id}`}>{article.title}</h2>
          <p className="story-description" data-testid={`text-description-${article.id}`}>{article.description}</p>
        </div>
        <div className="story-actions">
          <button
            className="simplify-button"
            type="button"
            onClick={handleExplain}
            aria-expanded={isOpen}
            data-testid={`button-simplify-${article.id}`}
          >
            {isWorking ? <LoaderCircle size={15} className="animate-spin" /> : isOpen && explanation ? <Check size={15} /> : <Sparkles size={15} />}
            {isWorking ? 'Breaking it down…' : isOpen ? 'Hide breakdown' : 'Make it simple'}
          </button>
        </div>
      </div>
      {isOpen && isWorking && (
        <div className="explanation" aria-live="polite" data-testid={`loading-explanation-${article.id}`}>
          <div className="explanation-label"><Sparkles size={14} /> Translating the finance-speak</div>
          <div className="mt-4 grid gap-2">
            <div className="h-3 w-4/5 animate-pulse rounded bg-slate-700/60" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-700/50" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-700/40" />
          </div>
        </div>
      )}
      {isOpen && simplify.isError && (
        <div className="inline-error" role="alert" data-testid={`error-explanation-${article.id}`}>
          <AlertCircle size={15} />
          <span>We couldn’t simplify this story just now.</span>
          <button type="button" onClick={retryExplain} data-testid={`button-retry-explanation-${article.id}`}>Try again</button>
        </div>
      )}
      {isOpen && explanation && (
        <section className="explanation" aria-label={`Plain-language explanation for ${article.title}`} data-testid={`panel-explanation-${article.id}`}>
          <div className="explanation-top">
            <div className="explanation-label"><Sparkles size={14} /> Here’s the plain-English version</div>
            <span className="mode-pill" data-testid={`status-model-${article.id}`}>{explanation.modelMode === 'demo' ? 'Example explanation' : 'AI explanation'}</span>
          </div>
          <p className="explain-summary" data-testid={`text-summary-${article.id}`}>{explanation.summary}</p>
          <div className="explain-grid">
            <div className="explain-block">
              <h3>What happened</h3>
              <ul className="key-points" data-testid={`list-key-points-${article.id}`}>
                {explanation.keyPoints.map((point, pointIndex) => (
                  <li key={`${article.id}-point-${pointIndex}`} data-testid={`text-key-point-${article.id}-${pointIndex}`}>
                    <span className="point-mark" aria-hidden="true" />{point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="explain-block">
              <h3>Quick translations</h3>
              {explanation.terms.length > 0 ? (
                <dl className="term-list" data-testid={`list-terms-${article.id}`}>
                  {explanation.terms.map((item, termIndex) => (
                    <div key={`${article.id}-term-${termIndex}`} data-testid={`term-${article.id}-${termIndex}`}>
                      <dt>{item.term}</dt>
                      <dd>{item.definition}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="m-0 text-xs text-slate-400">No finance terms need decoding in this one.</p>}
            </div>
          </div>
          <div className="why-block">
            <h3>Why it matters</h3>
            <p data-testid={`text-why-it-matters-${article.id}`}>{explanation.whyItMatters}</p>
          </div>
        </section>
      )}
      {article.url && article.source !== 'FinNews Demo Desk' && (
        <div className="px-6 pb-4 -mt-1">
          <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-cyan-200" data-testid={`link-original-${article.id}`}>
            Read original at {article.source} <ArrowUpRight size={12} aria-hidden="true" />
          </a>
        </div>
      )}
    </article>
  );
}

function Home() {
  const [category, setCategory] = useState<Category>('All');
  const [searchInput, setSearchInput] = useState('');
  const [queryText, setQueryText] = useState('');
  const [isSearchSettling, setIsSearchSettling] = useState(false);

  useEffect(() => {
    if (searchInput.trim() === queryText) {
      setIsSearchSettling(false);
      return;
    }
    setIsSearchSettling(true);
    const timer = window.setTimeout(() => {
      setQueryText(searchInput.trim());
      setIsSearchSettling(false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput, queryText]);

  const params = useMemo(() => ({
    category,
    ...(queryText ? { q: queryText } : {}),
  }), [category, queryText]);
  const newsQuery = useGetNews(params, {
    query: { queryKey: getGetNewsQueryKey(params) },
  });
  const response = newsQuery.data;
  const articles = response?.articles ?? [];
  const isSearching = isSearchSettling || newsQuery.isFetching;

  return (
    <div className="shell">
      <header className="topbar sticky top-0 z-20">
        <div className="app-main flex h-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark" aria-hidden="true"><BookOpenText size={18} strokeWidth={2.4} /></div>
            <div className="leading-none">
              <div className="font-[var(--app-font-serif)] text-[16px] font-extrabold tracking-[-.04em] text-slate-100">FinNews <span className="text-cyan-300">AI</span></div>
              <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[.16em] text-slate-500">Finance, made human</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 text-[10px] font-medium tracking-wide text-slate-400" data-testid="status-news-source">
            <span className={`h-1.5 w-1.5 rounded-full ${response?.sourceMode === 'newsapi' ? 'bg-emerald-400' : response?.sourceMode === 'demo' ? 'bg-amber-300' : 'bg-slate-500'}`} />
            {response?.sourceMode === 'newsapi' ? 'LIVE STORIES' : response?.sourceMode === 'demo' ? 'DEMO MODE' : 'LOADING BRIEF'}
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="hero">
          <div className="eyebrow"><span className="live-dot" /> The daily market brief, decoded</div>
          <h1 className="hero-title">Money news,<br /><span>minus the mystery.</span></h1>
          <p className="hero-copy">Big market moves can sound like another language. Get the story, the key terms, and why it matters — in a few clear sentences.</p>
          <div className="market-note" data-testid="text-product-promise">
            <Newspaper size={14} className="text-cyan-300" aria-hidden="true" />
            <span>Built for curious minds, not finance majors.</span>
          </div>
        </section>

        <section aria-label="Search and filter news">
          <div className="toolbar">
            <label className="search-wrap">
              <Search size={17} className="search-icon" aria-hidden="true" />
              <input
                className="search-input"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search companies, topics, or headlines"
                aria-label="Search financial news"
                data-testid="input-search-news"
              />
            </label>
            <div className="filter-row" role="group" aria-label="Filter by category">
              <span className="filter-label">Explore</span>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="filter-chip"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  data-testid={`filter-category-${item.toLowerCase().replaceAll(' ', '-')}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Recent financial stories">
          <div className="list-heading">
            <div>
              <p className="section-kicker">On the money</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="result-count" data-testid="text-result-count">
                  {response ? `${response.totalResults} ${response.totalResults === 1 ? 'story' : 'stories'}` : 'Recent stories'}
                </span>
                {queryText && <span className="result-count">for “{queryText}”</span>}
              </div>
            </div>
            <button
              type="button"
              className="refresh-button"
              onClick={() => newsQuery.refetch()}
              disabled={newsQuery.isFetching}
              data-testid="button-refresh-news"
            >
              <RefreshCw size={13} className={newsQuery.isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="story-list" aria-live="polite">
            {newsQuery.isLoading ? (
              Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={`skeleton-${index}`} data-testid={`skeleton-story-${index}`} />)
            ) : newsQuery.isError && !response ? (
              <div className="error-state" role="alert" data-testid="error-news">
                <div className="empty-icon"><AlertCircle size={19} /></div>
                <h2>We couldn’t load the headlines.</h2>
                <p>The news desk is having a moment. Give it another try in a little bit.</p>
                <button type="button" className="retry-button" onClick={() => newsQuery.refetch()} data-testid="button-retry-news">Try again</button>
              </div>
            ) : isSearching && articles.length === 0 ? (
              Array.from({ length: 3 }, (_, index) => <div className="skeleton-card" key={`search-skeleton-${index}`} data-testid={`skeleton-search-${index}`} />)
            ) : articles.length === 0 ? (
              <div className="empty-state" data-testid="empty-news">
                <div className="empty-icon"><Search size={18} /></div>
                <h2>{queryText ? 'No stories found for that search.' : 'It’s quiet on this beat.'}</h2>
                <p>{queryText ? 'Try a company name or a broader topic. The right story may be just one word away.' : 'Choose another category to see what is moving in the markets.'}</p>
                {queryText && (
                  <button type="button" className="retry-button" onClick={() => setSearchInput('')} data-testid="button-clear-search">Clear search</button>
                )}
              </div>
            ) : (
              articles.map((article, index) => <StoryCard key={article.id} article={article} index={index} />)
            )}
          </div>
          {newsQuery.isError && response && (
            <div className="mb-5 flex items-center gap-2 text-xs text-amber-200/80" role="status" data-testid="status-refresh-failed">
              <AlertCircle size={14} /> Couldn’t refresh just now. Showing the last loaded stories.
            </div>
          )}
        </section>
        <footer className="footer-note">
          <strong>FinNews AI</strong> explains the headlines, not what you should do with your money. Always look beyond a single story.
        </footer>
      </main>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;