/**
 * Stable parentId for the singleton homepage page_sections rows. The
 * homepage isn't a row in any pages table — there's only one — so we
 * use a fixed UUID and let parentKind="homepage" do the work.
 */
export const HOMEPAGE_PARENT_ID = "00000000-0000-0000-0000-000000000000";
