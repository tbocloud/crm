<!--
  TBO's mark, the default app logo when Brand Settings has none. The build
  serves it in place of components/Icons/CRMLogo.vue (frontend/tbo-brand.vite.js).
  Redrawn from the 191x80 PNG on teambackoffice.com; same paths as
  crm/public/tbo/tbo-mark.svg. Replace both with the official vector when it
  arrives. Square viewBox so it fits the stock logo's size-* boxes.
-->
<template>
  <svg
    viewBox="-8 -3 86 86"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="TBO"
  >
    <path d="M11 5 L52 0.5 L52 14 Z" fill="#FB991C" />
    <path d="M11 5 L52 10 L52 14 Z" fill="#D9771A" />
    <path
      d="M11 5 L52 14 L59 15.6 L59 66 L29.5 56.6 L33.5 79.5 L11 53 Z"
      fill="#1C7690"
    />
    <path
      d="M11 5 C14 36 32 56 59 66 L29.5 56.6 L33.5 79.5 L11 53 Z"
      fill="#145868"
    />
  </svg>
</template>
