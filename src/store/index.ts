import { createStore, combineReducers } from 'redux'
import * as CoursesReducer from './coursesReducer'
import * as WebsiteReducer from './websiteReducer'
import * as ConfigReducer from './configReducer'
import { OnlineCourse } from './coursesReducer'
import { configureStore } from '@reduxjs/toolkit'

export type State = {
  website: WebsiteReducer.State
  config: ConfigReducer.State
}

export type StateV2 = CoursesReducer.State | WebsiteReducer.StateV2

export type Actions = WebsiteReducer.Actions

export const Action = {
  ...WebsiteReducer.Action,
}

export const ActionV2 = {
  ...CoursesReducer.Action,
  ...WebsiteReducer.ActionV2,
}

export type StoreV2 = typeof storeV2

export const storeV2 = configureStore({
  reducer: {
    ...CoursesReducer.courseReducer,
    ...WebsiteReducer.websiteReducer,
  },
  middleware: [...WebsiteReducer.middlewares, ...CoursesReducer.middlewares],
})

export const Selector = {
  ...CoursesReducer.Selector,
  ...WebsiteReducer.Selector,
}

export const store = createStore<State, Actions, {}, {}>(
  combineReducers({
    website: WebsiteReducer.RootReducer,
    config: ConfigReducer.RootReducer,
  }),
  {
    website: WebsiteReducer.createInitialState({}),
    config: ConfigReducer.createInitialState({
      organisationId: process.env.ENVENTBRITE_ORG as string,
      isProduction: process.env.NODE_ENV === 'production',
      hostname: 'learnk8s.io',
      protocol: 'https',
      eventBriteToken: process.env.ENVENTBRITE_TOKEN as string,
      googleAnalytics: process.env.GOOGLE_ANALYTICS as string,
      outputFolder: '_site',
      canPublishEvents: process.env.PUBLISH_EVENTS === 'yes',
    }),
  },
)

export function getVenues(state: StateV2): CoursesReducer.CourseVenue[] {
  return Object.values(Selector.venues.selectAll(state))
}

export function getWorkshops(state: StateV2): CoursesReducer.FullWorkshop[] {
  return Object.values(Selector.workshops.selectAll(state)).map(workshop => {
    return {
      price: Object.values(Selector.prices.selectAll(state)).find(it => it.id === workshop.priceId)!,
      venue: Object.values(Selector.venues.selectAll(state)).find(it => it.id === workshop.venueId)!,
      picture: Object.values(Selector.pictures.selectAll(state)).find(it => it.id === workshop.pictureId)!,
      ...Object.values(Selector.courses.selectAll(state)).find(it => it.id === workshop.courseId)!,
      ...workshop,
    }
  })
}

export function getOnlineCourses(state: StateV2): OnlineCourse[] {
  return Object.values(Selector.onlineCourses.selectAll(state))
}

export function getConfig(state: State): ConfigReducer.State {
  return state.config
}

export function getPages(state: State): WebsiteReducer.Page[] {
  return Object.values(Selector.pages.selectAll(storeV2.getState()))
}

export function getOpenGraph(state: State): WebsiteReducer.OpenGraph[] {
  return Object.values(state.website.openGraph)
}

export function getLandingPageLocations(state: State): WebsiteReducer.LandingPage[] {
  return Object.values(Selector.landings.selectAll(storeV2.getState()))
}

export function getAuthors(state: State): WebsiteReducer.Author[] {
  return Object.values(state.website.authors)
}

export function getBlogPosts(state: State): WebsiteReducer.BlogPost[] {
  return Object.values(state.website.blogPosts)
}

export function hasTag(state: State, tagId: string) {
  return (page: WebsiteReducer.Page) => {
    return state.website.tags[page.id] && state.website.tags[page.id].includes(tagId)
  }
}

export function getBlogPostMarkdownBlocks(state: State): WebsiteReducer.BlogPostMarkdownBlock[] {
  return Object.values(state.website.relatedBlocks)
}

export function getRedirects(state: State): WebsiteReducer.Redirect[] {
  return Object.values(Selector.redirects.selectAll(storeV2.getState()))
}

export function getPreviewPictures(state: State): WebsiteReducer.PreviewPicture[] {
  return Object.values(Selector.previewPictures.selectAll(storeV2.getState()))
}
