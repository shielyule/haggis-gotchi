# X (Twitter) posts (drafts)

**Before posting:** the Social Blitz post must **start with `#KiroweenHackathon26`**. Standard X posts are
280 characters; each post below is counted (links count as 23, emoji as 2). Replace `https://www.youtube.com/watch?v=CC7yj3gtvZY`.
Post the main one with the video attached, then reply to it with the thread.

---

## Main post (with the video attached) · 275 characters

#KiroweenHackathon26 My favourite thing about Kiro: specs first. Each feature began as requirements; Kiro turned them into 62 property tests that found 11 bugs I'd missed.

I built Haggis-gotchi: a Scottish folklore pet that feels your weather 🐾🌧️

https://haggisgotchi.com

---

## Thread (replies to the main post)

**2/** · 217 characters
A Haggling hatches on your phone (no app store), lives six weeks, writes a diary each night from your real weather and town, and gets a stone in the kirkyard at the end. Six Scots temperaments, from douce to fair wud.

**3/** · 217 characters
Best bug the property tests caught: with the app open, the bars never moved. A 30-second refresh rounded every tiny drop back to zero. Example tests checked one big jump in time, so they never saw it. Random ones did.

**4/** · 223 characters
Steering = the rules Kiro follows every time. After one setup guide cost me two hours, we added: "check the provider's changelog and run read-only checks before asking the owner to click anything." It hasn't happened since.

**5/** · 223 characters
Plot twist: AWS Bedrock gave my new account 0 tokens a day, "not adjustable". Every AI feature had a written fallback, so players saw nothing wrong, and the diary moved to Gemini in an afternoon. Fallbacks are not optional.

**6/** · 108 characters
Watch the demo: https://www.youtube.com/watch?v=CC7yj3gtvZY
Specs, steering and hooks are all in the repo: https://github.com/shielyule/haggis-gotchi

#Kiro
