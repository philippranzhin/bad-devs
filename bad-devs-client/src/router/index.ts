import { createRouter, createWebHistory } from 'vue-router'
import CharacterCreation from '../views/CharacterCreation.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'character-creation',
      component: CharacterCreation,
    },
    {
      path: '/project-selection',
      name: 'project-selection',
      component: () => import('../views/ProjectSelection.vue'),
    },
    {
      path: '/game-session',
      name: 'game-session',
      component: () => import('../views/GameSession.vue'),
    },
    {
      path: '/round-results',
      name: 'round-results',
      component: () => import('../views/RoundResults.vue'),
    },
    {
      path: '/project-results',
      name: 'project-results',
      component: () => import('../views/ProjectResults.vue'),
    },
  ],
})

export default router
