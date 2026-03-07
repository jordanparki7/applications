"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import confetti from "canvas-confetti";

/* ================================================================
   TYPES
   ================================================================ */
interface ScriptBlock {
  lang: string;
  title: string;
  code: string;
}

interface Question {
  id: string;
  section: number;
  text: string;
  type: "text" | "script";
  script?: ScriptBlock;
  optional?: boolean;
  ageGate?: boolean;
  ndaGate?: boolean;
}

interface Message {
  id: number;
  from: "bot" | "user" | "section";
  text: string;
  script?: ScriptBlock;
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${part}-${index}`} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

/* ================================================================
   SECTION METADATA
   ================================================================ */
const SECTIONS: Record<number, { title: string; intro: string }> = {
  1: {
    title: "Section 1 Identity",
    intro: "Let\u2019s start with some basic information about you.",
  },
  2: {
    title: "Section 2 About You",
    intro: "Now let\u2019s learn about your experience and working style.",
  },
  3: {
    title: "Section 3 Skills Competency",
    intro:
      "In this section you\u2019ll review short scripts that contain errors, inefficiencies or logical flaws.\n\nFor each one, explain:\n\u2022 What is incorrect or problematic\n\u2022 Why it is an issue\n\u2022 How you would improve or refactor it\n\nClear, structured reasoning is valued more than brief answers.\nPlease do not use AI or external help - we want to see YOUR skills.",
  },
  4: {
    title: "Section 4 Future Directions",
    intro: "Nearly there! A few questions about your goals and availability.",
  },
};

/* ================================================================
   ROLE-SPECIFIC COMPETENCY SCRIPTS
   ================================================================ */
const ROLE_SCRIPTS: Record<string, ScriptBlock[]> = {
  behaviours: [
    {
      lang: "JSON",
      title: "Entity Behaviour \u2014 NPC Guard",
      code: `{
  "format_version": "1.16.0",
  "minecraft:entity": {
    "description": {
      "identifier": "team:guard_npc",
      "is_spawnable": true,
      "is_summonable": true
    },
    "components": {
      "minecraft:health": {
        "value": 20,
        "max": 10
      },
      "minecraft:movement": {
        "value": 0.35
      },
      "minecraft:navigation.walk": {
        "can_path_over_water": true,
        "avoid_water": true
      },
      "minecraft:behavior.nearest_attackable_target": {
        "priority": 1,
        "entity_types": [{
          "filters": {
            "test": "is_family",
            "subject": "other",
            "value": "player"
          },
          "max_dist": 100
        }]
      },
      "minecraft:behavior.melee_attack": {
        "priority": 2,
        "speed_multiplier": 1.5,
        "reach_multiplier": 3.0
      },
      "minecraft:attack": { "damage": 50 }
    }
  }
}`,
    },
    {
      lang: "JSON",
      title: "Animation Controller \u2014 Guard States",
      code: `{
  "format_version": "1.10.0",
  "animation_controllers": {
    "controller.animation.guard.main": {
      "initial_state": "idle",
      "states": {
        "idle": {
          "animations": ["idle"],
          "transitions": [
            { "walking": "query.is_moving" }
          ]
        },
        "walking": {
          "animations": ["walk"],
          "transitions": [
            { "idle": "!query.is_moving" },
            { "attacking": "query.is_delayed_attacking" }
          ]
        },
        "attacking": {
          "animations": ["attack"],
          "transitions": []
        }
      }
    }
  }
}`,
    },
  ],
  "project-manager": [
    {
      lang: "Plan",
      title: "Project Timeline \u2014 Medieval Kingdom Map",
      code: `Project: Marketplace Map \u2014 Medieval Kingdom
Duration: 8 weeks  |  Team: 5

Week 1     Concept art + blockout
Week 2     Full terrain build (1 builder)
Week 3-4   Structure builds (5 members)
Week 5     Texture pack creation
Week 5     Behaviour pack + entities
Week 6     QA testing
Week 6     Marketing assets + store art
Week 7     Submission to Marketplace
Week 8     Launch

Notes:
- Texture artist and dev idle weeks 1\u20134
- No review or revision cycles included
- No contingency or buffer time
- 1 QA tester, 1 week for full project
- Builder doing entire terrain solo in 1 week
- Submission same week as marketing`,
    },
    {
      lang: "Plan",
      title: "Task Allocation \u2014 Add-On Pack",
      code: `Task Allocation \u2014 Marketplace Add-On Pack

Dev A      All behaviours + 15 items + loot + trading    2 weeks
Modeller   All entity models (12 mobs)                   2 weeks
Artist     UI + marketing + store art                    2 weeks
QA         Final week testing only
PM         Meetings + admin

Dependencies:
  Dev needs models to test \u2192 models due week 2
  QA needs final build     \u2192 testing starts week 3

Submission deadline: end of week 3

Risks identified: None
Communication: \u201cMessage when needed\u201d`,
    },
  ],
  "3d-modeller": [
    {
      lang: "JSON",
      title: "Geometry \u2014 Custom Sword Model",
      code: `{
  "format_version": "1.12.0",
  "minecraft:geometry": [{
    "description": {
      "identifier": "geometry.custom_sword",
      "texture_width": 64,
      "texture_height": 64,
      "visible_bounds_width": 4,
      "visible_bounds_height": 4
    },
    "bones": [
      {
        "name": "handle",
        "pivot": [0, 0, 0],
        "cubes": [{
          "origin": [-0.5, 0, -0.5],
          "size": [1, 12, 1],
          "uv": [0, 0]
        }]
      },
      {
        "name": "blade",
        "parent": "guard",
        "pivot": [0, 12, 0],
        "cubes": [{
          "origin": [-1.5, 14, -0.5],
          "size": [3, 20, 1],
          "uv": [0, 0]
        }]
      },
      {
        "name": "guard",
        "parent": "handle",
        "pivot": [0, 12, 0],
        "cubes": [{
          "origin": [-3, 12, -0.5],
          "size": [6, 1, 1],
          "uv": [0, 0]
        }]
      }
    ]
  }]
}`,
    },
    {
      lang: "JSON",
      title: "Attachable \u2014 Custom Helmet",
      code: `{
  "format_version": "1.10.0",
  "minecraft:attachable": {
    "description": {
      "identifier": "team:custom_helmet",
      "materials": { "default": "entity" },
      "textures": {
        "default": "textures/entity/custom_helmet"
      },
      "geometry": {
        "default": "geometry.custom_helmet"
      },
      "render_controllers": [
        "controller.render.default"
      ],
      "scripts": {
        "parent_setup": "variable.helmet_layer_visible = 0.0;"
      }
    }
  }
}`,
    },
  ],
  "texture-artist": [
    {
      lang: "JSON",
      title: "Resource Pack Manifest",
      code: `{
  "format_version": 1,
  "header": {
    "name": "Cool Texture Pack",
    "description": "A really cool pack!!!",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "version": [1, 0, 0],
    "min_engine_version": [1, 14, 0]
  },
  "modules": [{
    "type": "resources",
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "version": [1, 0, 0]
  }]
}`,
    },
    {
      lang: "JSON",
      title: "Texture List \u2014 texture_list.json",
      code: `[
  "textures/blocks/custom_stone",
  "textures/blocks/custom_stone_slab",
  "textures/blocks/Custom_Wood",
  "textures/blocks/custom wood plank",
  "textures/blocks/custom_stone",
  "textures/items/custom_sword",
  "textures/entity/npc_villager"
]`,
    },
  ],
};

/* ================================================================
   QUESTION BUILDER
   ================================================================ */
function buildQuestions(role: string): Question[] {
  const qs: Question[] = [];

  /* --- Section 1: Identity --- */
  qs.push({ id: "discord", section: 1, type: "text", text: "What is your Discord username?" });
  qs.push({ id: "full_name", section: 1, type: "text", text: "What is your full name?" });
  qs.push({ id: "age", section: 1, type: "text", text: "What is your age?", ageGate: true });
  qs.push({ id: "email", section: 1, type: "text", text: "What is your email address?" });
  qs.push({ id: "location", section: 1, type: "text", text: "What is your current country and timezone?" });
  qs.push({ id: "nda", section: 1, type: "text", text: "Would you be happy to sign a mutual NDA - non-disclosure agreement?", ndaGate: true });
  qs.push({ id: "other_teams", section: 1, type: "text", text: "Do you currently work for any other Marketplace teams? If yes, who?" });
  qs.push({ id: "structures_jigsaws_features", section: 1, type: "text", text: "Do you have experience working with structures, jigsaws, features, and feature rules?" });

  /* --- Section 2: About You --- */
  qs.push({ id: "experience", section: 2, type: "text", text: "What experience do you have that you think would be relevant to the role you are applying for?" });
  qs.push({ id: "portfolio", section: 2, type: "text", text: "Please provide a link to your portfolio if you have one.", optional: true });
  qs.push({ id: "tools", section: 2, type: "text", text: "What tools are you familiar with using? e.g. GitHub, VS Code, Blockbench" });
  qs.push({ id: "scripting_lang", section: 2, type: "text", text: "What is your preferred scripting language? e.g. JavaScript, TypeScript, Python" });
  qs.push({ id: "marketplace_exp", section: 2, type: "text", text: "Have you ever worked on the Marketplace before? If so, with whom and in what role?" });
  qs.push({ id: "proud_project", section: 2, type: "text", text: "What project are you most proud of? What was your favourite element?" });
  qs.push({ id: "challenge", section: 2, type: "text", text: "Tell me about the most challenging technical issue you faced in a Minecraft project. How did you diagnose the problem and resolve it?" });
  qs.push({ id: "strengths_weaknesses", section: 2, type: "text", text: "What is your biggest strength? What is your biggest weakness?" });
  qs.push({ id: "motivation", section: 2, type: "text", text: "What type of projects motivate you most, and why?" });
  qs.push({ id: "feedback", section: 2, type: "text", text: "How do you typically respond to critical feedback?" });
  qs.push({ id: "english", section: 2, type: "text", text: "How comfortable are you communicating in English both verbally on voice calls and in writing?" });
  qs.push({ id: "hours", section: 2, type: "text", text: "How many hours per week can you dedicate to this role? Do you prefer a fixed schedule or flexible hours, and how do you plan your time to meet deadlines?" });

  /* --- Section 3: Competency (role scripts) --- */
  const scripts = ROLE_SCRIPTS[role] ?? ROLE_SCRIPTS["behaviours"];
  scripts.forEach((s, i) => {
    qs.push({
      id: `script_${i + 1}`,
      section: 3,
      type: "script",
      text: `Review the following ${s.lang} and provide your analysis. Explain what\u2019s wrong, why it\u2019s a problem, and how you\u2019d fix it.`,
      script: s,
    });
  });

  /* --- Section 4: Future Directions --- */
  qs.push({ id: "six_months", section: 4, type: "text", text: "Where would you like to be in 6 months within this role?" });
  qs.push({ id: "skills_develop", section: 4, type: "text", text: "What specific skills do you want to develop over the next year?" });
  qs.push({ id: "realistic_hours", section: 4, type: "text", text: "How many hours per week can you realistically commit to your role?" });
  qs.push({ id: "commitments", section: 4, type: "text", text: "What other commitments do you currently have (school, exams, work)?" });
  qs.push({ id: "schedule_changes", section: 4, type: "text", text: "Are there any upcoming changes in your schedule that may affect your availability?" });
  qs.push({ id: "productive_time", section: 4, type: "text", text: "What time of day are you typically most productive?" });
  qs.push({ id: "voice_calls", section: 4, type: "text", text: "Are you able to attend occasional scheduled voice calls if required?" });
  qs.push({ id: "final_note", section: 4, type: "text", text: "Is there anything else that you would like us to know?" });

  return qs;
}

/* ================================================================
   ROLE DISPLAY NAME
   ================================================================ */
const ROLE_NAMES: Record<string, string> = {
  behaviours: "Behaviours",
  "project-manager": "Project Manager",
  "3d-modeller": "3D Modeller",
  "texture-artist": "Texture Artist",
};

/* ================================================================
   COMPONENT
   ================================================================ */
export default function ApplyPage() {
  const { role } = useParams<{ role: string }>();
  const roleName = ROLE_NAMES[role] ?? role;
  const questions = useRef(buildQuestions(role)).current;
  const totalQs = questions.length;

  /* state */
  const [messages, setMessages] = useState<Message[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const msgId = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(false);

  const nextId = () => ++msgId.current;

  /* ---- auto-scroll ---- */
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  /* ---- push messages with staggered delays ---- */
  const queueMessages = useCallback(
    (msgs: Array<Omit<Message, "id">>, onDone?: () => void) => {
      setTyping(true);
      let cumDelay = 0;
      msgs.forEach((m, i) => {
        cumDelay += m.from === "section" ? 400 : 700 + Math.round(Math.random() * 300);
        const d = cumDelay;
        const isLast = i === msgs.length - 1;
        setTimeout(() => {
          setMessages((prev) => [...prev, { ...m, id: nextId() }]);
          if (isLast) {
            setTyping(false);
            onDone?.();
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }, d);
      });
    },
    []
  );

  /* ---- initial greeting ---- */
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const first = questions[0];
    const section = SECTIONS[first.section];
    queueMessages([
      { from: "bot", text: `Welcome! You\u2019re applying for the **${roleName}** role. Let\u2019s begin.` },
      { from: "section", text: section.title },
      { from: "bot", text: section.intro },
      { from: "bot", text: first.text, script: first.script },
    ]);
  }, [queueMessages, questions, roleName]);

  /* ---- send handler ---- */
  const send = () => {
    const text = input.trim();
    if (!text || typing || blocked || finished) return;

    const question = questions[qIdx];

    /* add user message */
    setMessages((prev) => [...prev, { id: nextId(), from: "user", text }]);
    setInput("");

    /* store answer */
    setAnswers((prev) => ({ ...prev, [question.id]: text }));

    /* age gate */
    if (question.ageGate) {
      const match = text.match(/\d+/);
      if (match && parseInt(match[0]) < 18) {
        setBlocked(true);
        queueMessages([
          {
            from: "bot",
            text: "Unfortunately we\u2019re unable to accept applications from individuals under 18. Thank you for your interest in Architects Edge.",
          },
        ]);
        return;
      }
    }

    /* NDA gate */
    if (question.ndaGate) {
      const neg = /^\s*(no|nah|nope|never|not really|i don'?t|i do not|i wouldn'?t|i would not|i refuse|decline|pass)\b/i;
      if (neg.test(text)) {
        setBlocked(true);
        queueMessages([
          {
            from: "bot",
            text: "Unfortunately we require all team members to sign a mutual NDA before onboarding. We\u2019re unable to proceed with your application at this time. Thank you for your interest in Architects Edge.",
          },
        ]);
        return;
      }
    }

    /* advance */
    const nextIdx = qIdx + 1;

    /* all done */
    if (nextIdx >= totalQs) {
      setFinished(true);
      /* save to localStorage */
      const finalAnswers = { ...answers, [question.id]: text };
      const submittedAt = new Date().toISOString();
      localStorage.setItem(
        `ae_application_${role}`,
        JSON.stringify({ role, submittedAt, answers: finalAnswers })
      );

      /* send to Discord webhook */
      fetch("/api/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          roleName,
          submittedAt,
          answers: finalAnswers,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const raw = await response.text().catch(() => "");
            let details: unknown = null;

            if (raw) {
              try {
                details = JSON.parse(raw);
              } catch {
                details = { raw };
              }
            }

            // Keep this as a warning to avoid Next dev's red console-error overlay.
            console.warn("Discord webhook submission failed", {
              status: response.status,
              details,
            });
          }
        })
        .catch((error) => {
          // Keep this as a warning to avoid Next dev's red console-error overlay.
          console.warn("Discord webhook submission error", error);
        });

      /* Celebrate */
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
      const sfx = new Audio("/complete.mp3");
      sfx.volume = 0.33;
      sfx.play().catch(() => {});

      queueMessages([
        { from: "section", text: "Section 5 Thank You!" },
        {
          from: "bot",
          text: "Thank you for your application! If your application is successful, we will be in touch soon.\n\nYour responses have been recorded.",
        },
      ]);
      return;
    }

    /* next question */
    const nextQ = questions[nextIdx];
    const sectionChanged = nextQ.section !== question.section;
    setQIdx(nextIdx);

    const msgs: Array<Omit<Message, "id">> = [];

    if (sectionChanged) {
      const sec = SECTIONS[nextQ.section];
      msgs.push({ from: "section", text: sec.title });
      msgs.push({ from: "bot", text: sec.intro });
    }

    msgs.push({ from: "bot", text: nextQ.text, script: nextQ.script });

    queueMessages(msgs);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ---- current section info ---- */
  const currentSection = questions[Math.min(qIdx, totalQs - 1)].section;
  const progressPct = finished ? 100 : ((qIdx + 1) / totalQs) * 100;

  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* ---- header ---- */}
      <header className="shrink-0 border-b border-white/[0.06] px-4 py-3 bg-[#0A0A0A]">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <Image
              src="/botlogo.svg"
              alt="Logo"
              width={28}
              height={28}
              className="w-7 h-7 rounded-md group-hover:opacity-80 transition-opacity"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-medium text-white/50 truncate block">
              Application - {roleName}
            </span>
          </div>
          <span className="text-[11px] text-white/20 tabular-nums">
            {Math.min(qIdx + 1, totalQs)}/{totalQs}
          </span>
        </div>
      </header>

      {/* ---- progress ---- */}
      <div className="shrink-0 px-4">
        <div className="max-w-2xl mx-auto pt-2 pb-1">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex-1 h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7C3AED] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-white/25 whitespace-nowrap">
              {finished ? "Complete" : `Section ${currentSection} of 4`}
            </span>
          </div>
        </div>
      </div>

      {/* ---- chat area ---- */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.map((m) => {
            if (m.from === "section") {
              return (
                <div key={m.id} className="flex justify-center py-3">
                  <span className="text-[11px] font-semibold text-[#7C3AED] tracking-wide uppercase bg-[#7C3AED]/[0.06] border border-[#7C3AED]/15 rounded-full px-4 py-1">
                    {m.text}
                  </span>
                </div>
              );
            }

            if (m.from === "user") {
              return (
                <div key={m.id} className="flex justify-end animate-fade-in">
                  <div className="max-w-[90%] sm:max-w-[78%] rounded-2xl rounded-br-sm px-7 py-4 text-sm leading-relaxed bg-[#7C3AED]/15 border border-[#7C3AED]/15 text-white/90 whitespace-pre-wrap">
                    {renderInlineBold(m.text)}
                  </div>
                </div>
              );
            }

            /* bot */
            return (
              <div key={m.id} className="flex justify-start gap-4 animate-fade-in">
                <Image
                  src="/botlogo.svg"
                  alt="Bot"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg shrink-0 mt-0.5"
                />
                <div className="max-w-[90%] sm:max-w-[78%]">
                  <div className="rounded-2xl rounded-bl-sm px-7 py-4 text-sm leading-relaxed bg-white/[0.04] border border-white/[0.06] text-white/80 whitespace-pre-wrap">
                    {renderInlineBold(m.text)}
                  </div>
                  {m.script && (
                    <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
                        <span className="text-[11px] font-medium text-white/40 truncate">
                          {m.script.title}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-[#7C3AED]/15 text-[#8B5CF6] font-mono shrink-0 ml-2">
                          {m.script.lang}
                        </span>
                      </div>
                      <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed text-white/60 font-mono whitespace-pre">
                        <code>{m.script.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* typing indicator */}
          {typing && (
            <div className="flex justify-start gap-4 animate-fade-in">
              <Image
                src="/botlogo.svg"
                alt="Typing"
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg shrink-0 mt-0.5"
              />
              <div className="rounded-2xl rounded-bl-sm px-6 py-4 bg-white/[0.04] border border-white/[0.06] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] typing-dot" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- input area ---- */}
      <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 bg-[#0A0A0A]">
        <div className="max-w-2xl mx-auto">
          {finished || blocked ? (
            <div className="text-center py-2">
              <p className="text-xs text-white/30 mb-3">
                {blocked
                  ? "This application has been closed."
                  : "Your application has been submitted."}
              </p>
              <Link
                href="/"
                className="inline-block px-5 py-2 rounded-lg border border-white/[0.08] text-[13px] text-white/50 hover:text-white hover:border-white/20 transition-all"
              >
                ← Back to Home
              </Link>
            </div>
          ) : (
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your answer…"
                disabled={typing}
                rows={2}
                className="w-full resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3 pr-14 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#7C3AED]/40 transition-all disabled:opacity-40"
              />
              <button
                onClick={send}
                disabled={!input.trim() || typing}
                className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white text-sm cursor-pointer transition-all hover:bg-[#6D28D9] disabled:opacity-25 disabled:hover:bg-[#7C3AED]"
              >
                ↑
              </button>
            </div>
          )}
          {!finished && !blocked && (
            <p className="text-[10px] text-white/15 mt-1.5 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
