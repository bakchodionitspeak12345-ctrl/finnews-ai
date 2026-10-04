import { Router, type IRouter } from "express";
import {
  GetNewsQueryParams,
  GetNewsResponse,
  SimplifyArticleBody,
  SimplifyArticleResponse,
} from "@workspace/api-zod";
import {
  getFinancialNews,
  simplifyFinancialArticle,
} from "../lib/financial-news";

const router: IRouter = Router();

router.get("/news", async (req, res): Promise<void> => {
  const parsed = GetNewsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid category and search phrase." });
    return;
  }

  try {
    const result = await getFinancialNews(parsed.data.category, parsed.data.q);
    res.json(GetNewsResponse.parse(result));
  } catch (error) {
    req.log.error(
      { err: error, provider: "newsapi" },
      "Unable to fetch financial news",
    );
    res.status(502).json({
      error:
        "Live news is temporarily unavailable. Check your NewsAPI key or try again shortly.",
    });
  }
});

router.post("/news/simplify", async (req, res): Promise<void> => {
  const parsed = SimplifyArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add an article title and description to simplify it." });
    return;
  }

  try {
    const result = await simplifyFinancialArticle(parsed.data);
    res.json(SimplifyArticleResponse.parse(result));
  } catch (error) {
    req.log.error(
      { err: error, provider: "groq" },
      "Unable to simplify financial article",
    );
    res.status(502).json({
      error:
        "The AI explainer is temporarily unavailable. Check your Groq key or try again shortly.",
    });
  }
});

export default router;