declare module "latex.js" {
  export class HtmlGenerator {
    constructor(options?: { hyphenate?: boolean; baseURL?: string });
  }
  export function parse(
    latex: string,
    options: { generator: HtmlGenerator }
  ): { domFragment(): DocumentFragment; htmlDocument(): Document };
}
