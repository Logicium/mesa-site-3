/**
 * The public route table, with each page's SEO record.
 *
 * This is the only list of public routes. The router spreads it; the
 * prerender (scripts/prerender.ts) walks it to write one HTML file per page,
 * the sitemap, robots.txt and llms.txt; the runtime applies the same records on
 * navigation. Checkout, order and admin routes live in the router and are
 * never indexed. Every field reads the reactive site config when it is called,
 * so a provisioned build and a hydrated page both describe the owner's
 * business. No browser dependency here: the prerender imports this under Node.
 */
import type { RouteRecordRaw } from 'vue-router'
import { esc } from '@apotome/archetype-shared/seo/index'
import * as b from '@apotome/archetype-shared/seo/bodies'
import { menuNode } from '@apotome/archetype-shared/seo/nodes'
import { requireVariant } from '@apotome/archetype-shared/platform/variantGuard'
import { variantAtLeast } from '@apotome/archetype-shared/themes/tokens'
import { siteConfig as c, type MenuCategory } from './config/site.config'

const town = () => c.contact.address.split(',')[1]?.trim() ?? ''
const place = () => (town() ? `${c.brand} in ${town()}` : c.brand)
const portfolio = () => variantAtLeast(c.variant, 'portfolio')

/** The menu as readable HTML: category, dish, description, price. */
function menuBody(categories: MenuCategory[], title?: string, intro?: string): string {
  const cats = categories.filter((cat) => cat.items?.length)
  if (!cats.length) return ''
  const items = cats
    .map(
      (cat) =>
        `<section>${b.h(3, cat.name)}${b.p(cat.description)}<ul>${cat.items
          .map((it) => {
            const price = it.sizes?.length ? it.sizes.map((s) => `${s.label} ${s.price}`).join(', ') : it.price
            return `<li><strong>${esc(it.name)}</strong>${it.description ? `, ${esc(it.description)}` : ''}${price ? ` (${esc(price)})` : ''}</li>`
          })
          .join('')}</ul></section>`,
    )
    .join('')
  return `<section>${b.h(2, title)}${b.p(intro)}${items}</section>`
}

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue'),
    meta: {
      seo: {
        description: () =>
          b.compose([c.blurb, `See the menu, opening hours and how to find us${town() ? ` in ${town()}` : ""}`, c.tagline]),
        schema: ({ site }) => menuNode(site, '/menu', c.menu.categories, `${c.brand} menu`),
        body: () =>
          b.main(
            b.hero(c.brand, c.tagline, c.blurb),
            b.story(c.story, c.sections.story.eyebrow),
            menuBody(c.menu.categories.slice(0, portfolio() ? 3 : 2), c.sections.featured.title, c.menu.intro),
            b.hours(c.hours, c.sections.hours.title, c.sections.hours.note),
            b.testimonials(c.testimonials, c.sections.reviews.eyebrow),
            b.contact(c.contact, c.sections.contact.title),
            b.photos(c.photos.gallery, c.sections.gallery.title, 8),
          ),
      },
    },
  },
  {
    path: '/menu',
    name: 'menu',
    component: () => import('./views/MenuView.vue'),
    meta: {
      seo: {
        title: () => c.sections.menuPage.title,
        description: () => {
          const cats = b.listOf(c.menu.categories.filter((cat) => cat.items?.length).map((cat) => cat.name.toLowerCase()))
          return b.compose([`The full menu at ${place()}${cats ? `: ${cats}, every dish with its price` : ', with prices'}`, c.menu.intro, c.sections.hours.note])
        },
        schema: ({ site, path }) => menuNode(site, path, c.menu.categories, `${c.brand} menu`),
        body: () =>
          b.main(
            b.hero(c.sections.menuPage.title, c.sections.menuPage.eyebrow, c.menu.intro),
            menuBody(c.menu.categories),
            c.menu.fullMenuUrl ? `<p><a href="${esc(c.menu.fullMenuUrl)}">${esc(c.sections.menu.fullMenuLabel)}</a></p>` : '',
            b.contact(c.contact, c.sections.contact.title),
          ),
      },
    },
  },
  {
    path: '/visit',
    name: 'visit',
    component: () => import('./views/VisitView.vue'),
    meta: {
      seo: {
        title: () => c.sections.visit.title,
        description: () =>
          b.compose([
            `How to find ${c.brand}${c.contact.address ? ` at ${c.contact.address}` : ''}: opening hours, directions and how to reach us by phone or email`,
            c.sections.visit.subtitle,
          ]),
        body: () =>
          b.main(
            b.hero(c.sections.visit.title, c.sections.visit.eyebrow, c.sections.visit.subtitle),
            b.contact(c.contact, c.sections.contact.title),
            b.hours(c.hours, c.sections.hours.title, c.sections.hours.note),
          ),
      },
    },
  },
  {
    // Always registered; the guard keeps it paid-only. Omitting the route
    // here would strand upgraded sites, whose variant only arrives after
    // this module has already been evaluated. Out of the index until then.
    path: '/gallery',
    name: 'gallery',
    component: () => import('./views/GalleryView.vue'),
    beforeEnter: requireVariant('portfolio', () => c.variant),
    meta: {
      seo: {
        title: () => c.sections.galleryPage.title,
        description: () => {
          const shots = b.listOf(c.photos.gallery.map((ph) => ph.alt?.toLowerCase()), 5)
          return b.compose([`Photos from ${place()}${shots ? `: ${shots}` : ''}`, c.tagline, c.blurb])
        },
        image: () => c.photos.about.src || undefined,
        noindex: () => !portfolio(),
        body: () => b.main(b.hero(c.sections.galleryPage.title, c.sections.galleryPage.eyebrow), b.photos(c.photos.gallery)),
      },
    },
  },
]

/** The catch-all: a real not-found page, noindex, never a redirect home. */
export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('./views/NotFoundView.vue'),
  meta: { seo: { title: 'Page not found', description: () => `That page is not on the ${c.brand} website.`, noindex: true } },
}
