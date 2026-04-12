const Database = require('/Users/mini/.openclaw/workspace/mission-control/node_modules/better-sqlite3');
const db = new Database('/Users/mini/.openclaw/workspace/mission-control/data/mission.db');

const part2 = `

---

# EPHESIANS CHAPTERS 5-6
## Small Group Sessions: Nov 23, 2025 & Jan 11, 2026

---

## OVERVIEW

These chapters form the practical culmination of Ephesians. The great shift from indicatives (what God has done, ch. 1-3) to imperatives (how we are to live, ch. 4-6).

---

# EPHESIANS 5:5-21 — From Models to Motivation

Paul moves on in his treatment of Christian behavior from MODELS to MOTIVATION.

"Incentives are HUGE — everything in life — business, industry, etc. People know what they ought to do — the question is how can they be motivated to do it?"

THE DOCTRINE OF SANCTIFICATION — the ongoing process of becoming like Christ. The four incentives below are all engines of sanctification.

---

## INCENTIVE 1: The Certainty of Judgment (5:5-7) — THE FUTURE

Key Verse: "For of this you can be sure: No immoral, impure or greedy person has any inheritance in the kingdom of Christ and God."

- Paul presents fear of judgment as a legitimate, powerful motivation for holy living
- In Paul's day, Gnostics argued bodily sins could be committed without damage to the soul — Paul emphatically rejects this
- "The Western Church's doctrine of Judgment is quite watered down — this is not Paul's view."
- "Partners" (v.7) in Greek = participation, not mere association — like Lot in Sodom, proximity to evil risks sharing in its doom
- SOLEMN WARNING HERE FROM PAUL — we shall be wise to heed it!

---

## INCENTIVE 2: The Fruit of the Light (5:8-14) — THE PAST/PRESENT

Key Verse: "For at one time you were darkness, but now you are light in the Lord. Walk as children of light."

- Not merely behavioral contrast — ontological: you *were* darkness, you *are* light
- The fruit of the light: goodness, righteousness, truth (v.9)
- The whole paragraph plays on the rich symbolism of darkness and light

---

## INCENTIVE 3: The Nature of Wisdom (5:15-17) — PRESENT DISCERNMENT

Key Verse: "Look carefully then how you walk, not as unwise but as wise, making the best use of the time, because the days are evil."

- Wisdom = practical, relational, spiritually aware — not merely intellectual
- "Redeeming the time" = recognizing the urgency of the present moment
- Foolishness is not just intellectual failure — it is moral failure

---

## INCENTIVE 4: The Fullness of the Holy Spirit (5:18-21) — PRESENT EMPOWERMENT

Key Verse: "Do not get drunk with wine… but be filled with the Spirit."

- Spirit-filled life produces: Worship (psalms, hymns), Gratitude (always giving thanks), Mutual submission
- "Be filled" = present continuous passive — ongoing, relational filling, not a one-time crisis experience
- V.21 "submitting to one another out of reverence for Christ" — the hinge verse into household codes

---

# EPHESIANS 5:21-6:9 — Household Codes

All three relationships governed by mutual submission in reverence for Christ (5:21).

## Marriage (5:22-33)

Wives' submission (5:22-24):
- Voluntary, modeled on the church's relationship to Christ
- Standard: "as to the Lord" — elevates the relationship to a sacred, covenant dimension

Husbands' love (5:25-33):
- Far more demanding: love as Christ loved the church
- Sacrificial, self-giving love aimed at wife's sanctification and flourishing
- The husband is called to die to self — a far higher and more costly demand

The Mystery of Marriage (5:31-32):
- Paul quotes Genesis 2:24 — "the two shall become one flesh"
- Human marriage is a living picture of Christ's relationship to the church
- Not merely a social contract — a theological proclamation

## Children and Parents (6:1-4)

- Children: obey parents — grounded in creation order and the fifth commandment (first commandment with a promise)
- Fathers: "Do not provoke your children to anger, but bring them up in the discipline and instruction of the Lord."
- Fathers are not merely authority figures — they are formative shepherds of their children's souls

## Servants and Masters (6:5-9)

- Labor done "as to Christ" takes on eternal significance even within unjust social structures
- Masters: "You both have the same Master in heaven, and there is no partiality with him." (6:9)
- The economic hierarchy of the world is relativized under the absolute lordship of Christ

---

# EPHESIANS 6:10-20 — The Armor of God

Key Verse: "Finally, be strong in the Lord and in the strength of his might. Put on the whole armor of God."

The Christian life is fundamentally SPIRITUAL WARFARE against supernatural enemies — not merely moral or social struggle.

"We do not wrestle against flesh and blood, but against the rulers, against the authorities, against the cosmic powers over this present darkness." (6:12)

The command: STAND — not advance, not retreat, but hold the ground that Christ has already won.

THE SIX PIECES OF ARMOR:

1. Belt of Truth (6:14) — integrity; the truth of the gospel as foundational girding
2. Breastplate of Righteousness (6:14) — imputed and lived-out righteousness protecting the heart
3. Shoes of the Gospel of Peace (6:15) — readiness; grounded in the peace Christ has made
4. Shield of Faith (6:16) — active trust that extinguishes the evil one's flaming darts
5. Helmet of Salvation (6:17) — assurance of salvation protecting the mind
6. Sword of the Spirit (6:17) — THE WORD OF GOD — the one offensive weapon

Note: First five pieces are DEFENSIVE. The sword is OFFENSIVE. Mirrors Jesus in Matthew 4 — "It is written…" in response to every satanic assault.

PRAYER — THE ATMOSPHERE OF WARFARE (6:18-20):
- Prayer is not a seventh piece of armor — it is the ATMOSPHERE in which all the armor is worn
- "Praying at all times in the Spirit" — not occasional crisis management but continuous posture
- Paul asks for boldness to proclaim the gospel even in chains — "an ambassador in chains"
- The letter begins with prayer (ch. 1) and ends with prayer (ch. 6) — for Paul, the Christian life is held together by intercession

---

# EPHESIANS 6:21-24 — Closing Benediction

"Peace be to the brothers, and love with faith, from God the Father and the Lord Jesus Christ."
"Grace be with all who love our Lord Jesus Christ with love incorruptible."

- Sends Tychicus to deliver the letter personally
- Deeply Trinitarian closing — mirrors the Trinitarian opening in 1:3-14
- As Alistair Begg noted: "Grace and peace begins, ends with peace and grace."
- The entire letter is bookended by grace — fitting for a letter about the grace of God in Christ

---

Report Part 2 compiled from 17 Ephesians notes | Generated April 12, 2026
`;

const existing = db.prepare('SELECT id, content FROM knowledge_reports WHERE topic = ? ORDER BY id DESC LIMIT 1').get('bible');
if (existing) {
  db.prepare("UPDATE knowledge_reports SET content = ?, title = ?, updated = datetime('now') WHERE id = ?")
    .run(existing.content + '\n' + part2, 'Ephesians Study — Complete Small Group Notes (Sept 2025 – Jan 2026)', existing.id);
  console.log('Updated report id:', existing.id, '— now', (existing.content + part2).length, 'chars');
} else {
  db.prepare('INSERT INTO knowledge_reports (title, topic, content) VALUES (?,?,?)').run('Ephesians Study', 'bible', part2);
  console.log('Inserted new report');
}
