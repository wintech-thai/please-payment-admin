declare module 'react-qr-code' {
  import { FC, SVGProps } from 'react'

  interface QRCodeProps extends SVGProps<SVGSVGElement> {
    value: string
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    bgColor?: string
    fgColor?: string
    includeMargin?: boolean
  }

  const QRCode: FC<QRCodeProps>
  export default QRCode
}
