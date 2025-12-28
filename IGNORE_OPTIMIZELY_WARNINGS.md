# Optimizely Console Warnings - Ignore These

## ✅ These Are Harmless

The warnings you're seeing:
```
[OPTIMIZELY] - WARN Invalid eventBatchSize undefined, defaulting to 10
[OPTIMIZELY] - WARN Invalid eventFlushInterval undefined, defaulting to 1000
```

These are **completely unrelated** to your GoCardless OAuth issue. They're just the Optimizely analytics SDK using default values when configuration isn't provided.

**You can safely ignore these warnings.** They don't affect your app's functionality.

---

## 🔍 Focus on GoCardless Issue

The important thing is to diagnose the GoCardless redirect URI issue. 

**Please check the redirect URI being sent** - see `URGENT_FIX_STEPS.md` for the diagnostic script.





