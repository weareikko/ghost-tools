// @ikko-dev/ghost-core
// Shared business logic — executors, routes, context

export {
  ACTIONS,
  isReadAction,
  isWriteAction,
  READ_ACTIONS,
  RESOURCES,
  WRITE_ACTIONS,
} from './constants.ts';
export type { Action, ReadAction, Resource, WriteAction } from './constants.ts';

export { createTestExecutorContext } from './context.ts';
export type { ExecutorContext, ExecutorResult } from './context.ts';

export { buildPath, request, ROUTES } from './routes.ts';
export type { ApiKind, HttpMethod, RouteDefinition, RouteParams, RequestOptions } from './routes.ts';

export type { Executor, BrowseOptions, ReadOptions } from './executors/types.ts';

// Posts
export {
  addPost,
  browsePosts,
  copyPost,
  deletePost,
  editPost,
  readPost,
} from './executors/posts.ts';
export type { AddPostOptions, EditPostOptions } from './executors/posts.ts';

// Pages
export {
  addPage,
  browsePages,
  copyPage,
  deletePage,
  editPage,
  readPage,
} from './executors/pages.ts';
export type { AddPageOptions, EditPageOptions } from './executors/pages.ts';

// Tags
export { addTag, browseTags, deleteTag, editTag, readTag } from './executors/tags.ts';
export type { AddTagOptions, EditTagOptions } from './executors/tags.ts';

// Members
export {
  addMember,
  browseMembers,
  editMember,
  readMember,
} from './executors/members.ts';
export type { AddMemberOptions, EditMemberOptions } from './executors/members.ts';

// Tiers
export { addTier, browseTiers, editTier, readTier } from './executors/tiers.ts';
export type { AddTierOptions, EditTierOptions } from './executors/tiers.ts';

// Newsletters
export {
  addNewsletter,
  browseNewsletters,
  editNewsletter,
  readNewsletter,
} from './executors/newsletters.ts';
export type {
  AddNewsletterOptions,
  EditNewsletterOptions,
} from './executors/newsletters.ts';

// Offers
export { addOffer, browseOffers, editOffer, readOffer } from './executors/offers.ts';
export type { AddOfferOptions, EditOfferOptions } from './executors/offers.ts';

// Users + Roles
export {
  browseRoles,
  browseUsers,
  deleteUser,
  editUser,
  readUser,
} from './executors/users.ts';
export type { EditUserOptions } from './executors/users.ts';

// Invites
export {
  addInvite,
  browseInvites,
  deleteInvite,
  readInvite,
} from './executors/invites.ts';
export type { AddInviteOptions, Invite } from './executors/invites.ts';

// Webhooks
export {
  addWebhook,
  deleteWebhook,
  editWebhook,
} from './executors/webhooks.ts';
export type { AddWebhookOptions, EditWebhookOptions } from './executors/webhooks.ts';

// Images
export { uploadImage } from './executors/images.ts';
export type { UploadImageOptions } from './executors/images.ts';

// Themes
export { activateTheme, uploadTheme } from './executors/themes.ts';
export type { Theme, UploadThemeOptions } from './executors/themes.ts';

// Site + Settings
export { readSite } from './executors/site.ts';
export { editSettings, readSettings } from './executors/settings.ts';
export type { EditSettingsOptions, SettingEntry } from './executors/settings.ts';

// Authors (content API)
export { browseAuthors, readAuthor } from './executors/authors.ts';
