/**
 * Totalum standard asset map.
 *
 * Single source of truth lives in the project-root `assets/files.ts`; this file
 * only re-shapes it into the `{ description, url }` map the platform expects,
 * so there is never a second list to keep in sync.
 */
import { BRAND_ICONS } from "../../assets/files";

// all files (images, logos, documents)
export const files: { [fileName: string]: { description: string; url: string } } = {
  crakrevenue: { description: "CrakRevenue whale brand icon", url: BRAND_ICONS.crakrevenue },
  awin: { description: "Awin flame brand icon", url: BRAND_ICONS.awin },
  mylead: { description: "MyLead moneybag brand icon", url: BRAND_ICONS.mylead },
};
