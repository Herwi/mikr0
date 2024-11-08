// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://ricardo-devis-agullo.github.io',
  // base: 'mikr0',
	integrations: [
		starlight({
			title: 'Mikr0',
			social: {
				github: 'https://github.com/ricardo-devis-agullo/mikr0',
			},
			sidebar: [
				{
					label: 'Welcome',
					items: [
						{ label: 'Getting started', slug: 'guides/getting-started' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
