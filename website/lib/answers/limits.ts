/**
 * Numbers the answer engine is tuned to, kept free of any database import
 * so they can be read from a test, a client component, or an admin screen
 * without dragging a connection along.
 */

/** Events one visitor may send in a window. */
export const RATE_MAX_EVENTS = 30;

/** Length of that window, in seconds. Fixed, not sliding. */
export const RATE_WINDOW_SECONDS = 60;

/** How long a sentence somebody typed is kept. Deliberately shorter than
 *  the counts around it — by six months it has either been read and acted
 *  on or it never will be. */
export const WANTED_RETENTION_DAYS = 180;

/** How long the rows themselves are kept. */
export const ROW_RETENTION_DAYS = 400;
