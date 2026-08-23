<script setup lang="ts">
import { computed, ref } from 'vue'

interface MenuItem { name: string; description?: string; price: string; tags?: string[] }
interface MenuCategory { name: string; description?: string; items: MenuItem[] }

const props = withDefaults(defineProps<{
  eyebrow?: string
  title?: string
  intro?: string
  categories: MenuCategory[]
  /** Optional menu PDF or external link. */
  fullMenuUrl?: string
  /** Label on the full-menu button. Owner-editable. */
  fullMenuLabel?: string
}>(), { title: 'Menu', fullMenuLabel: 'View full menu' })

/* ── Long-menu handling ──
   A short menu reads beautifully as one flowing list. A 60-item menu on the
   same layout becomes an endless single column with a canyon of dotted
   leaders between short dish names and prices.

   Past a threshold the section switches into "index" mode: categories become
   collapsible with counts, a chip rail jumps between them, and items flow
   into multiple dense columns so the width is actually used. Short menus are
   untouched — no accordions to click through for six dishes. */
const LONG_MENU_ITEMS = 24
const LONG_CATEGORY_ITEMS = 10

const totalItems = computed(() =>
  props.categories.reduce((n, c) => n + (c.items?.length ?? 0), 0))

const isLongMenu = computed(() =>
  totalItems.value > LONG_MENU_ITEMS ||
  props.categories.some(c => (c.items?.length ?? 0) > LONG_CATEGORY_ITEMS))

/** Collapsed category names. Long menus open the first course only. */
const collapsed = ref<Set<string>>(new Set())
let seeded = false
const isCollapsed = (name: string) => {
  if (!isLongMenu.value) return false
  if (!seeded) {
    seeded = true
    collapsed.value = new Set(props.categories.slice(1).map(c => c.name))
  }
  return collapsed.value.has(name)
}
function toggleCategory(name: string) {
  const next = new Set(collapsed.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  collapsed.value = next
}
function expandAll() { collapsed.value = new Set() }
function collapseAll() { collapsed.value = new Set(props.categories.map(c => c.name)) }
const allExpanded = computed(() => collapsed.value.size === 0)

const catId = (name: string) =>
  'menu-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Jump to a course from the chip rail, opening it if it was closed. */
function jumpTo(name: string) {
  const next = new Set(collapsed.value)
  next.delete(name)
  collapsed.value = next
  requestAnimationFrame(() => {
    document.getElementById(catId(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<!--
  MenuSection renders 3 interchangeable layouts via data-site-style on <html>.
  Style 1 · Ledger     — classic two-column dotted-leader price list (default)
  Style 2 · Tasting    — boxed cards in a grid with bold price chips
  Style 3 · Chalkboard — single dramatic column, oversized numbered courses
-->
<template>
  <section class="ap-section ap-menu">
    <div class="ap-container">
      <div class="ap-section-head">
        <span v-if="eyebrow" class="ap-eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="intro" style="color: var(--ap-ink-muted)">{{ intro }}</p>
      </div>

      <!-- Course rail + expand control: only earns its place on a long menu. -->
      <div v-if="isLongMenu" class="ap-menu__rail">
        <div class="ap-menu__rail-chips">
          <button
            v-for="cat in categories"
            :key="cat.name"
            type="button"
            class="ap-menu__rail-chip"
            @click="jumpTo(cat.name)"
          >
            {{ cat.name }}
            <span class="ap-menu__rail-count">{{ cat.items.length }}</span>
          </button>
        </div>
        <button type="button" class="ap-menu__rail-toggle" @click="allExpanded ? collapseAll() : expandAll()">
          {{ allExpanded ? 'Collapse all' : 'Expand all' }}
        </button>
      </div>

      <!-- ── Style 1 · Ledger (default) ── -->
      <div class="ap-menu__ledger" :class="{ 'is-long': isLongMenu }">
        <div class="ap-menu__cats">
          <section
            v-for="cat in categories"
            :key="cat.name"
            :id="catId(cat.name)"
            class="ap-menu__cat"
            :class="{ 'is-collapsed': isCollapsed(cat.name) }"
          >
            <header>
              <component
                :is="isLongMenu ? 'button' : 'div'"
                :type="isLongMenu ? 'button' : undefined"
                class="ap-menu__cat-head"
                :class="{ 'is-toggle': isLongMenu }"
                :aria-expanded="isLongMenu ? !isCollapsed(cat.name) : undefined"
                :aria-controls="isLongMenu ? catId(cat.name) + '-items' : undefined"
                @click="isLongMenu && toggleCategory(cat.name)"
              >
                <h3>{{ cat.name }}</h3>
                <span v-if="isLongMenu" class="ap-menu__cat-meta">
                  <span class="ap-menu__cat-count">{{ cat.items.length }}</span>
                  <svg class="ap-menu__chev" viewBox="0 0 12 12" aria-hidden="true" width="12" height="12">
                    <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </component>
              <p v-if="cat.description">{{ cat.description }}</p>
            </header>
            <ul
              v-show="!isCollapsed(cat.name)"
              :id="catId(cat.name) + '-items'"
              :class="{ 'ap-menu__items--dense': isLongMenu && cat.items.length > 6 }"
            >
              <li v-for="item in cat.items" :key="item.name" class="ap-menu__item">
                <div class="ap-menu__line">
                  <span class="ap-menu__name">{{ item.name }}</span>
                  <span class="ap-menu__leader" />
                  <span class="ap-menu__price">{{ item.price }}</span>
                </div>
                <p v-if="item.description" class="ap-menu__desc">{{ item.description }}</p>
                <p v-if="item.tags?.length" class="ap-menu__tags">
                  <span v-for="t in item.tags" :key="t">{{ t }}</span>
                </p>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <!-- ── Style 2 · Tasting cards ── -->
      <div class="ap-menu__tasting">
        <section
          v-for="cat in categories"
          :key="cat.name"
          :id="catId(cat.name)"
          class="ap-menu__tasting-cat"
        >
          <header class="ap-menu__tasting-head">
            <component
              :is="isLongMenu ? 'button' : 'div'"
              :type="isLongMenu ? 'button' : undefined"
              class="ap-menu__cat-head"
              :class="{ 'is-toggle': isLongMenu }"
              :aria-expanded="isLongMenu ? !isCollapsed(cat.name) : undefined"
              @click="isLongMenu && toggleCategory(cat.name)"
            >
              <h3>{{ cat.name }}</h3>
              <span v-if="isLongMenu" class="ap-menu__cat-meta">
                <span class="ap-menu__cat-count">{{ cat.items.length }}</span>
                <svg class="ap-menu__chev" viewBox="0 0 12 12" aria-hidden="true" width="12" height="12">
                  <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </component>
            <p v-if="cat.description">{{ cat.description }}</p>
          </header>
          <ul v-show="!isCollapsed(cat.name)" class="ap-menu__tasting-grid">
            <li v-for="item in cat.items" :key="item.name" class="ap-menu__tasting-card">
              <div class="ap-menu__tasting-top">
                <h4>{{ item.name }}</h4>
                <span class="ap-menu__tasting-chip">{{ item.price }}</span>
              </div>
              <p v-if="item.description">{{ item.description }}</p>
              <p v-if="item.tags?.length" class="ap-menu__tasting-tags">
                <span v-for="t in item.tags" :key="t">{{ t }}</span>
              </p>
            </li>
          </ul>
        </section>
      </div>

      <!-- ── Style 3 · Chalkboard marquee ── -->
      <div class="ap-menu__chalk">
        <section
          v-for="cat in categories"
          :key="cat.name"
          :id="catId(cat.name)"
          class="ap-menu__chalk-cat"
        >
          <header class="ap-menu__chalk-head">
            <component
              :is="isLongMenu ? 'button' : 'div'"
              :type="isLongMenu ? 'button' : undefined"
              class="ap-menu__chalk-toggle"
              :class="{ 'is-toggle': isLongMenu }"
              :aria-expanded="isLongMenu ? !isCollapsed(cat.name) : undefined"
              @click="isLongMenu && toggleCategory(cat.name)"
            >
              <span class="ap-menu__chalk-marker">— {{ cat.name }} —</span>
              <span v-if="isLongMenu" class="ap-menu__cat-meta">
                <span class="ap-menu__cat-count">{{ cat.items.length }}</span>
                <svg class="ap-menu__chev" viewBox="0 0 12 12" aria-hidden="true" width="12" height="12">
                  <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </component>
            <p v-if="cat.description">{{ cat.description }}</p>
          </header>
          <ol v-show="!isCollapsed(cat.name)" class="ap-menu__chalk-list">
            <li v-for="(item, i) in cat.items" :key="item.name" class="ap-menu__chalk-row">
              <span class="ap-menu__chalk-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="ap-menu__chalk-body">
                <h4>{{ item.name }}</h4>
                <p v-if="item.description">{{ item.description }}</p>
                <p v-if="item.tags?.length" class="ap-menu__chalk-tags">
                  <span v-for="t in item.tags" :key="t">{{ t }}</span>
                </p>
              </div>
              <span class="ap-menu__chalk-price">{{ item.price }}</span>
            </li>
          </ol>
        </section>
      </div>

      <p v-if="fullMenuUrl" class="ap-menu__more">
        <a :href="fullMenuUrl" target="_blank" rel="noopener" class="ap-btn ap-btn--ghost">{{ fullMenuLabel }}</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
/* Visibility gating — only one variant renders at a time */
.ap-menu__ledger,
.ap-menu__tasting,
.ap-menu__chalk { display: none; }
[data-site-style='1'] .ap-menu__ledger { display: block; }

/* ── Long-menu chrome: course rail + collapsible headers ──── */
.ap-menu__rail {
  display: flex; align-items: center; gap: 1rem;
  flex-wrap: wrap;
  padding-bottom: 0.9rem;
  margin-bottom: clamp(1.5rem, 3vw, 2.25rem);
  border-bottom: 1px solid var(--ap-line);
}
.ap-menu__rail-chips {
  display: flex; gap: 0.4rem; flex-wrap: wrap;
  flex: 1; min-width: 0;
}
.ap-menu__rail-chip {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--ap-line);
  border-radius: 999px;
  background: transparent;
  color: var(--ap-ink);
  font: inherit; font-size: 0.82rem;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.ap-menu__rail-chip:hover { border-color: var(--ap-ink); background: var(--ap-surface-alt); }
.ap-menu__rail-count {
  font-family: var(--ap-font-mono);
  font-size: 0.66rem;
  color: var(--ap-ink-muted);
  font-variant-numeric: tabular-nums;
}
.ap-menu__rail-toggle {
  border: 0; background: none; padding: 0.3rem 0;
  color: var(--ap-ink-muted);
  font: inherit; font-size: 0.78rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: color 140ms ease, border-color 140ms ease;
  flex-shrink: 0;
}
.ap-menu__rail-toggle:hover { color: var(--ap-ink); border-bottom-color: var(--ap-primary); }

.ap-menu__cat-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 0.75rem; width: 100%;
  padding: 0; border: 0; background: none;
  color: inherit; font: inherit; text-align: left;
}
.ap-menu__cat-head.is-toggle { cursor: pointer; }
.ap-menu__cat-head.is-toggle:hover h3 { color: var(--ap-primary); }
.ap-menu__cat-meta {
  display: inline-flex; align-items: center; gap: 0.5rem;
  color: var(--ap-ink-muted);
  flex-shrink: 0;
}
.ap-menu__cat-count {
  font-family: var(--ap-font-mono);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.ap-menu__chev { transition: transform 220ms cubic-bezier(0.2, 0.7, 0.3, 1); }
.ap-menu__cat.is-collapsed .ap-menu__chev,
.ap-menu__cat-head[aria-expanded='false'] .ap-menu__chev { transform: rotate(-90deg); }

.ap-menu__chalk-toggle {
  display: flex; align-items: center; justify-content: center; gap: 0.6rem;
  width: 100%; padding: 0; border: 0; background: none;
  color: inherit; font: inherit;
}
.ap-menu__chalk-toggle.is-toggle { cursor: pointer; }

/* ── Style 1 · Ledger ────────────────────────────────────── */
.ap-menu__cats {
  display: grid; gap: clamp(2rem, 4vw, 3.5rem);
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}
/* A long menu stacks courses full-width and flows their items into columns,
   instead of one endless narrow list beside an empty half-page. */
.ap-menu__ledger.is-long .ap-menu__cats {
  grid-template-columns: 1fr;
  gap: clamp(1.25rem, 2.5vw, 2rem);
}
.ap-menu__ledger.is-long .ap-menu__cat {
  padding-bottom: clamp(1.25rem, 2.5vw, 2rem);
  border-bottom: 1px solid var(--ap-line);
}
.ap-menu__ledger.is-long .ap-menu__cat:last-child { border-bottom: 0; }
.ap-menu__items--dense {
  columns: 2;
  column-gap: clamp(2rem, 5vw, 4.5rem);
}
.ap-menu__items--dense > li {
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
}
@media (min-width: 1100px) {
  .ap-menu__items--dense { columns: 3; }
}
@media (max-width: 700px) {
  .ap-menu__items--dense { columns: 1; }
}
.ap-menu__cat header { margin-bottom: 1.25rem; }
.ap-menu__cat h3 { margin: 0 0 0.25rem; }
.ap-menu__cat header p { color: var(--ap-ink-muted); font-style: italic; margin: 0; }
.ap-menu__cat ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 1.1rem; }
.ap-menu__line {
  display: grid; grid-template-columns: auto 1fr auto;
  align-items: baseline; gap: 0.5rem;
  font-family: var(--ap-font-heading);
}
.ap-menu__name { font-size: 1.05rem; }
.ap-menu__price { color: var(--ap-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
.ap-menu__leader {
  border-bottom: 1px dotted var(--ap-line);
  align-self: end; height: 0.7em;
}
.ap-menu__desc { margin: 0.25rem 0 0; color: var(--ap-ink-muted); font-size: 0.95rem; }
.ap-menu__tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0.4rem 0 0; }
.ap-menu__tags span {
  font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
  background: var(--ap-surface-alt); border: 1px solid var(--ap-line);
  border-radius: 999px; padding: 0.15rem 0.5rem; color: var(--ap-ink-muted);
}
[data-theme='vibrant'] .ap-menu__price { background: var(--ap-accent); color: var(--ap-ink); padding: 0 0.4rem; }

/* ── Style 2 · Tasting cards ─────────────────────────────── */
[data-site-style='2'] .ap-menu__tasting {
  display: grid; gap: clamp(2.5rem, 5vw, 4rem);
}
.ap-menu__tasting-head { text-align: center; margin-bottom: 1.5rem; }
.ap-menu__tasting-head h3 {
  margin: 0; font-size: clamp(1.5rem, 3vw, 2rem);
  position: relative; display: inline-block;
  padding: 0 1.5rem;
}
.ap-menu__tasting-head h3::before,
.ap-menu__tasting-head h3::after {
  content: ''; position: absolute; top: 50%; width: 2.5rem;
  height: 1px; background: var(--ap-line);
}
.ap-menu__tasting-head h3::before { right: 100%; }
.ap-menu__tasting-head h3::after { left: 100%; }
.ap-menu__tasting-head p { color: var(--ap-ink-muted); font-style: italic; margin: 0.5rem 0 0; }
.ap-menu__tasting-grid {
  list-style: none; padding: 0; margin: 0;
  display: grid; gap: clamp(1rem, 2vw, 1.5rem);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.ap-menu__tasting-card {
  background: var(--ap-surface);
  border: 1px solid var(--ap-line);
  border-radius: var(--ap-radius);
  padding: clamp(1.25rem, 2.5vw, 1.75rem);
  display: flex; flex-direction: column; gap: 0.6rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.ap-menu__tasting-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--ap-shadow-lg);
}
.ap-menu__tasting-top {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;
}
.ap-menu__tasting-top h4 {
  margin: 0; font-size: 1.05rem;
  font-family: var(--ap-font-heading);
}
.ap-menu__tasting-chip {
  flex-shrink: 0;
  background: var(--ap-primary); color: var(--ap-on-primary);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-family: var(--ap-font-mono);
  font-size: 0.78rem; font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ap-menu__tasting-card p { margin: 0; color: var(--ap-ink-muted); font-size: 0.92rem; line-height: 1.5; }
.ap-menu__tasting-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.ap-menu__tasting-tags span {
  font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ap-ink-muted);
  border: 1px solid var(--ap-line); padding: 0.1rem 0.45rem; border-radius: 4px;
}
[data-theme='vibrant'] .ap-menu__tasting-card {
  border: 2.5px solid var(--ap-ink);
  box-shadow: 4px 4px 0 var(--ap-ink);
}
[data-theme='vibrant'] .ap-menu__tasting-card:hover {
  box-shadow: 6px 6px 0 var(--ap-ink);
}
[data-theme='vibrant'] .ap-menu__tasting-chip {
  background: var(--ap-accent); color: var(--ap-ink);
  border: 2px solid var(--ap-ink); border-radius: 4px;
}

/* ── Style 3 · Chalkboard marquee ─────────────────────────── */
[data-site-style='3'] .ap-menu__chalk {
  display: block;
  max-width: 760px; margin: 0 auto;
}
.ap-menu__chalk-cat + .ap-menu__chalk-cat { margin-top: clamp(3rem, 6vw, 4.5rem); }
.ap-menu__chalk-head { text-align: center; margin-bottom: 2rem; }
.ap-menu__chalk-marker {
  display: inline-block;
  font-family: var(--ap-font-heading);
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ap-primary);
}
.ap-menu__chalk-head p { color: var(--ap-ink-muted); font-style: italic; margin: 0.4rem 0 0; }
.ap-menu__chalk-list {
  list-style: none; padding: 0; margin: 0;
  display: grid; gap: 1.5rem;
}
.ap-menu__chalk-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: clamp(0.85rem, 2vw, 1.5rem);
  align-items: baseline;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--ap-line);
}
.ap-menu__chalk-row:last-child { border-bottom: none; }
.ap-menu__chalk-num {
  font-family: var(--ap-font-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1;
  color: var(--ap-accent);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.ap-menu__chalk-body h4 {
  margin: 0; font-size: clamp(1.15rem, 2vw, 1.4rem);
  font-family: var(--ap-font-heading);
}
.ap-menu__chalk-body p { margin: 0.35rem 0 0; color: var(--ap-ink-muted); }
.ap-menu__chalk-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.6rem; }
.ap-menu__chalk-tags span {
  font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ap-ink-muted);
}
.ap-menu__chalk-tags span + span::before { content: '·'; margin-right: 0.4rem; }
.ap-menu__chalk-price {
  font-family: var(--ap-font-heading);
  font-size: clamp(1.1rem, 2.5vw, 1.5rem);
  color: var(--ap-primary); font-weight: 700;
  font-variant-numeric: tabular-nums;
}
[data-theme='vibrant'] .ap-menu__chalk-num {
  color: var(--ap-ink);
  background: var(--ap-accent);
  padding: 0.1rem 0.5rem;
  border: 2px solid var(--ap-ink);
}
[data-theme='vibrant'] .ap-menu__chalk-price {
  background: var(--ap-ink); color: var(--ap-accent);
  padding: 0.1rem 0.55rem;
}

.ap-menu__more { margin-top: clamp(2rem, 4vw, 3rem); }
</style>
