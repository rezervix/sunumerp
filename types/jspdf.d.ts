declare module "jspdf" {
  export interface JsPDFOptions {
    orientation?: "portrait" | "landscape" | "p" | "l"
    unit?: "pt" | "px" | "in" | "mm" | "cm" | "ex" | "em" | "pc"
    format?: string | number[]
  }

  export class jsPDF {
    constructor(options?: JsPDFOptions)
    setFont(fontName: string, fontStyle?: string): this
    setFontSize(size: number): this
    text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): this
    line(x1: number, y1: number, x2: number, y2: number): this
    addPage(): this
    save(filename?: string): void
    output(type: "arraybuffer"): ArrayBuffer
    output(type?: string): unknown
  }

  export default jsPDF
}
