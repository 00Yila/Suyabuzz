import React from 'react'
import { body, display } from '@/lib/fonts'
import './styles.css'

export const metadata = {
  description: 'Nigerian street food, pre-order for weekend pickup in Tustin, CA.',
  title: 'SuyaBuzz',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
