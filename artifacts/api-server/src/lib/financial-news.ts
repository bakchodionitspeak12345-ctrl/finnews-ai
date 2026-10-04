import { createHash } from "node:crypto";
import type {
  ArticleSimplification,
  ArticleSimplificationInput,
  FinancialTerm,
  NewsArticle,
} from "@workspace/api-zod";

const DEMO_SOURCE = "FinNews Demo Desk";
const NEWS_API_ENDPOINT = "https://newsapi.org/v2/everything";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type NewsApiArticle = {
  title?: string | null;
  source?: { name?: string | null } | null;
  publishedAt?: string | null;
  description?: string | null;
  content?: string | null;
  url?: string | null;
  urlToImage?: string | null;
};

type NewsApiResponse = {
  status?: string;
  code?: string;
  message?: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
};

const demoStories: Array<{
  title: string;
  description: string;
  content: string;
  category: NewsArticle["category"];
  hoursAgo: number;
}> = [
  {
    title: "Investors weigh inflation data as markets look for their next signal",
    description:
      "A sample market briefing explores how a slower rise in everyday prices could influence expectations for interest rates and company shares.",
    content:
      "This fictional demo briefing looks at inflation, interest rates, and stock market expectations. It is sample content for demonstrating the explainer, not a report of a real event.",
    category: "Stock Market",
    hoursAgo: 1,
  },
  {
    title: "What a change in bond yields could mean for everyday investors",
    description:
      "This demo story looks at the link between government bond yields, borrowing costs, and the way investors compare stocks with bonds.",
    content:
      "In this fictional market example, bond yields move higher and investors compare the return from bonds with the potential return from stocks. Higher yields can also affect borrowing costs.",
    category: "Stock Market",
    hoursAgo: 3,
  },
  {
    title: "Household spending offers a new clue about the pace of the economy",
    description:
      "A sample economic update explains why economists track purchases by households when judging whether growth is speeding up or cooling down.",
    content:
      "This fictional demo update examines consumer spending and gross domestic product. Household purchases make up a large part of economic activity, but one data point does not establish a lasting trend.",
    category: "Economy",
    hoursAgo: 4,
  },
  {
    title: "Inflation cools in a sample report, but prices remain above past levels",
    description:
      "The demo briefing separates a slower pace of price increases from prices actually falling, a distinction that can be easy to miss.",
    content:
      "In this fictional example, inflation is cooling. That means prices are rising more slowly, not necessarily falling. The article also explains why a central bank may watch inflation before changing interest rates.",
    category: "Economy",
    hoursAgo: 6,
  },
  {
    title: "Retailers focus on profit margins as shoppers compare prices",
    description:
      "This sample business story looks at how companies balance sales, operating costs, and profit when customers become more price-conscious.",
    content:
      "This fictional company briefing focuses on revenue, costs, and profit margins. Revenue is money a business earns from sales, while a profit margin shows how much of that revenue remains after costs.",
    category: "Business",
    hoursAgo: 8,
  },
  {
    title: "A startup's sample earnings update puts revenue growth in focus",
    description:
      "The demo story shows why investors may look beyond a company's sales growth to ask whether it can turn revenue into lasting profits.",
    content:
      "This fictional earnings announcement highlights revenue growth, operating expenses, and net income. Fast-growing sales can be encouraging, but a company also needs to manage costs.",
    category: "Business",
    hoursAgo: 10,
  },
  {
    title: "Digital payments prompt banks to rethink how customers move money",
    description:
      "A sample banking briefing examines how payment apps and instant transfers are changing customer expectations for speed and convenience.",
    content:
      "This fictional banking story discusses deposits, payments, and the way banks process transfers. A bank deposit is money held in an account, while a payment network moves funds between people or businesses.",
    category: "Banking",
    hoursAgo: 12,
  },
  {
    title: "Why loan rates matter to first-time home buyers and small businesses",
    description:
      "This demo explainer connects interest rates to monthly loan payments and the cost of borrowing for households and businesses.",
    content:
      "This fictional credit-market briefing explains interest rates on loans. When borrowing rates rise, monthly payments on new loans can increase, which may affect spending and business investment.",
    category: "Banking",
    hoursAgo: 16,
  },
  {
    title: "Chip makers plan capacity as demand for computing grows",
    description:
      "This sample technology story explains why chip companies weigh long-term investment against changing demand from device and data-center customers.",
    content:
      "This fictional technology briefing covers semiconductor demand, capital investment, and company earnings. Building production capacity can take years, so companies try to plan for demand without overinvesting.",
    category: "Technology",
    hoursAgo: 19,
  },
  {
    title: "New software tools reshape how small firms track their finances",
    description:
      "The demo report considers how automation could change bookkeeping costs and the way smaller companies understand their cash flow.",
    content:
      "This fictional business technology story looks at cash flow, software subscriptions, and operating costs. Cash flow tracks money moving into and out of a business over time.",
    category: "Technology",
    hoursAgo: 22,
  },
];

const categorySearchTerms: Record<NewsArticle["category"], string> = {
  "Stock Market": "stock market OR shares OR stocks OR investing OR bonds",
  Economy: "economy OR inflation OR GDP OR consumer spending OR employment",
  Business: "business OR companies OR earnings OR corporate",
  Banking: "banking OR banks OR loans OR credit OR payments",
  Technology: "technology OR software OR semiconductor OR artificial intelligence",
};

function asHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function guessCategory(text: string): NewsArticle["category"] {
  const normalized = text.toLowerCase();
  if (/bank|loan|credit|payment|deposit/.test(normalized)) return "Banking";
  if (/stock|share|bond|investor|market|equity/.test(normalized)) {
    return "Stock Market";
  }
  if (/inflation|economy|economic|gdp|employment|recession|consumer spending/.test(normalized)) {
    return "Economy";
  }
  if (/technology|software|chip|semiconductor|artificial intelligence|ai /.test(normalized)) {
    return "Technology";
  }
  return "Business";
}

function demoArticles(): NewsArticle[] {
  return demoStories.map((story, index) => {
    const publishedAt = new Date(Date.now() - story.hoursAgo * 60 * 60 * 1000);
    return {
      id: `demo-${index + 1}`,
      title: story.title,
      source: DEMO_SOURCE,
      publishedAt,
      description: story.description,
      content: story.content,
      url: "https://example.com/finnews-ai-demo",
      imageUrl: null,
      category: story.category,
    };
  });
}

export async function getFinancialNews(category: string, query?: string) {
  const apiKey = process.env.NEWSAPI_KEY?.trim();
  if (!apiKey) {
    const normalizedQuery = query?.trim().toLowerCase();
    const articles = demoArticles().filter((article) => {
      const matchesCategory = category === "All" || article.category === category;
      const searchable = `${article.title} ${article.description} ${article.content}`.toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
    return { articles, sourceMode: "demo" as const, totalResults: articles.length };
  }

  const params = new URLSearchParams({
    language: "en",
    sortBy: "publishedAt",
    pageSize: "30",
  });
  const categoryTerm =
    category === "All"
      ? "finance OR financial OR economy OR business OR markets OR banking OR technology"
      : categorySearchTerms[category as NewsArticle["category"]];
  const searchTerm = query?.trim();
  params.set(
    "q",
    searchTerm ? `(${categoryTerm}) AND ${searchTerm}` : categoryTerm,
  );

  const response = await fetch(`${NEWS_API_ENDPOINT}?${params}`, {
    headers: { "X-Api-Key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as NewsApiResponse;
  if (!response.ok || data.status === "error") {
    throw new Error(
      `NewsAPI request failed (${response.status}${data.code ? `: ${data.code}` : ""})`,
    );
  }

  const articles = (data.articles ?? [])
    .filter((article) => article.title && article.url && article.publishedAt)
    .map((article, index): NewsArticle => {
      const title = article.title?.trim() || "Untitled financial news";
      const description =
        article.description?.trim() ||
        article.content?.trim() ||
        "Open the original article for more details.";
      const id = createHash("sha256")
        .update(article.url ?? `${title}-${index}`)
        .digest("hex")
        .slice(0, 20);
      return {
        id: `news-${id}`,
        title,
        source: article.source?.name?.trim() || "News source",
        publishedAt: new Date(article.publishedAt as string),
        description,
        content: article.content ?? null,
        url: asHttpsUrl(article.url) ?? "https://newsapi.org/",
        imageUrl: asHttpsUrl(article.urlToImage),
        category:
          category === "All"
            ? guessCategory(`${title} ${description}`)
            : (category as NewsArticle["category"]),
      };
    });

  return {
    articles,
    sourceMode: "newsapi" as const,
    totalResults: data.totalResults ?? articles.length,
  };
}

const financialDefinitions: Array<{
  pattern: RegExp;
  term: string;
  definition: string;
}> = [
  { pattern: /\binflation\b/i, term: "Inflation", definition: "A general rise in prices over time, which reduces how much the same amount of money can buy." },
  { pattern: /\binterest rates?\b/i, term: "Interest rate", definition: "The cost of borrowing money, or the return earned for lending or saving it." },
  { pattern: /\b(gdp|gross domestic product)\b/i, term: "GDP", definition: "The total value of goods and services produced in a country over a period of time." },
  { pattern: /\b(revenue|sales)\b/i, term: "Revenue", definition: "The money a company brings in from selling goods or services before subtracting costs." },
  { pattern: /\bprofit margin\b/i, term: "Profit margin", definition: "The share of a company's revenue that remains as profit after costs." },
  { pattern: /\b(profit|earnings|net income)\b/i, term: "Earnings", definition: "The profit a company makes after its expenses are taken into account." },
  { pattern: /\b(bond|bonds|yield|yields)\b/i, term: "Bond yield", definition: "The return an investor receives from a bond, often expressed as a percentage." },
  { pattern: /\b(stock|stocks|share|shares|equity)\b/i, term: "Stock", definition: "A small ownership stake in a company that can rise or fall in value." },
  { pattern: /\b(central bank|federal reserve)\b/i, term: "Central bank", definition: "A public institution that guides a country's money and interest-rate policy." },
  { pattern: /\b(cash flow)\b/i, term: "Cash flow", definition: "The movement of money into and out of a person or business over time." },
  { pattern: /\b(loan|loans|borrowing)\b/i, term: "Loan", definition: "Money borrowed with an agreement to repay it, usually with interest." },
  { pattern: /\b(deposit|deposits)\b/i, term: "Deposit", definition: "Money placed into a bank account, where it can be held and accessed later." },
  { pattern: /\b(consumer spending|spending)\b/i, term: "Consumer spending", definition: "Money households spend on goods and services." },
  { pattern: /\b(capital investment|investment)\b/i, term: "Investment", definition: "Money put into an asset or project with the expectation of future value or benefit." },
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25);
}

function createDemoSimplification(
  article: ArticleSimplificationInput,
): ArticleSimplification {
  const originalText = [article.description, article.content]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = splitSentences(originalText);
  const keyPoints = (sentences.length ? sentences : [originalText])
    .slice(0, 3)
    .map((sentence) =>
      sentence.length > 190 ? `${sentence.slice(0, 187).trimEnd()}…` : sentence,
    );
  const terms: FinancialTerm[] = financialDefinitions
    .filter(({ pattern }) => pattern.test(`${article.title} ${originalText}`))
    .slice(0, 5)
    .map(({ term, definition }) => ({ term, definition }));
  const summary =
    originalText.length > 0
      ? `In everyday terms: ${originalText.slice(0, 550)}${originalText.length > 550 ? "…" : ""}`
      : `This article, “${article.title},” covers a financial or business development. Read the original report for the full context.`;

  return {
    summary,
    keyPoints:
      keyPoints.length > 0
        ? keyPoints
        : ["The article discusses a financial or business topic."],
    terms:
      terms.length > 0
        ? terms
        : [
            {
              term: "Market",
              definition:
                "A place or system where people buy and sell things such as company shares, bonds, or goods.",
            },
          ],
    whyItMatters:
      "Changes in business and the economy can affect prices, jobs, borrowing costs, and the value of investments. This is general education, not personal financial advice.",
    modelMode: "demo",
  };
}

export async function simplifyFinancialArticle(
  article: ArticleSimplificationInput,
): Promise<ArticleSimplification> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return createDemoSimplification(article);

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.25,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You explain business and financial news to college students and complete beginners. Be accurate, neutral, plain-spoken, and concise. Do not invent facts, predictions, or personal financial advice. Return a JSON object with exactly these fields: summary (string), keyPoints (array of 2 to 4 short strings), terms (array of up to 5 objects each with term and beginner-friendly definition), whyItMatters (string). Only include terms that are relevant to the supplied article. If details are missing, say so clearly.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: article.title,
            source: article.source,
            description: article.description,
            articleExcerpt: article.content,
          }),
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  if (!response.ok) {
    throw new Error(`Groq request failed (${response.status})`);
  }

  const generated = payload.choices?.[0]?.message?.content;
  if (!generated) throw new Error("Groq returned an empty explanation");
  const parsed = JSON.parse(generated) as Omit<ArticleSimplification, "modelMode">;

  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    terms: parsed.terms,
    whyItMatters: parsed.whyItMatters,
    modelMode: "groq",
  };
}