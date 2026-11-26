# LinkedIn post (draft)

**Before posting:**
- Replace `https://www.youtube.com/watch?v=CC7yj3gtvZY` and check the GitHub link works (the repo must be public first).
- For the **Social Blitz** prize the post must **start with `#KiroweenHackathon26`** (keep it as the very first word)
  and is judged on original thoughts, not AI writing. Read it aloud and change anything that doesn't sound like you.
  The `[YOUR WORDS]` line is the one the judges care about most.
- Post on submission day. Attach the video (native upload does better than a link) or the mother-page image.

---

#KiroweenHackathon26 My favourite thing about Kiro: it made me write down what I wanted before it wrote a line of code, and then it held me to it.

For the Kiroween 2026 hackathon I built Haggis-gotchi, a Tamagotchi-style pet based on Scottish folklore. A wee Haggling hatches on your phone, feels your real local weather (Douce loves rain, Skeigh hides from thunder), lives about six weeks, and ends up with a stone in the mother's kirkyard.

How Kiro changed the way I worked:

📋 Every feature started as a spec: requirements, then a design, then tasks. 17 of them by the end.
🧪 Kiro turned those requirements into 62 property-based tests that throw thousands of random Hagglings at each rule. They found 11 real problems my normal tests missed, including bars that froze whenever the app was open.
🧭 Steering files hold the rules we learned the hard way. After one bad afternoon with a database setup guide, we wrote a rule: check the provider's changelog and test before asking me to click anything. It hasn't happened since.
🪝 Hooks block secrets from ever reaching the code, and keep the tests in step when a requirement changes.

[YOUR WORDS: one or two sentences on what surprised you, e.g. what it was like to direct the work rather than type it.]

Not everything went to plan: Amazon Bedrock gave my brand-new AWS account a daily limit of zero tokens, and support couldn't lift it in time. Because every AI feature had a written fallback, players never noticed, and the diary moved to Google Gemini in an afternoon.

🎬 Watch: https://www.youtube.com/watch?v=CC7yj3gtvZY
🥚 Get your own egg: https://haggisgotchi.com
💻 Code (with the specs, steering and hooks): https://github.com/shielyule/haggis-gotchi

#Kiro #AWS #BuildInPublic #Scotland #GameDev
