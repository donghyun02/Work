import Vue from 'vue'
import Vuex from 'vuex'
import VueCookie from 'vue-cookie'

import createPersistedState from 'vuex-persistedstate'
import axios from 'axios'
import router from '@/router'
import { format, getYear, getISOWeek } from 'date-fns'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    user: {},
    isAuthenticated: false,
    token: {
      access: '',
      refresh: '',
    },
    dailyWork: {
      workTime: '0',
    },
    weeklyWork: {
      workTime: '0',
    },
  },
  plugins: [createPersistedState({
    key: 'a1m0nd.kr',
    storage: {
      getItem: key => VueCookie.get(key),
      setItem: (key, value) =>
        VueCookie.set(key, value),
      removeItem: key => VueCookie.delete(key)
    }
  })],
  mutations: {
    setUser (state, val) {
      state.user = val
    },
    setIsAuthenticated (state, val) {
      state.isAuthenticated = val
    },
    setTokens (state, val) {
      state.token = val
    },
    setAccessToken (state, val) {
      state.token.access = val
    },
    setWeeklyWork (state, val) {
      state.weeklyWork = val
    },
    setDailyWork (state, val) {
      state.dailyWork = val
    },
  },
  actions: {
    refreshToken (context, data) {
      axios.post('/api/token/refresh/', data)
        .then((response) => {
          context.commit('setAccessToken', response.data.access)
          context.commit('setIsAuthenticated', true)
        })
        .catch((error) => {
          if (error.response.status === 401) {
            context.commit('setIsAuthenticated', false)
            if (!router.currentRoute.path.startsWith('/login')) {
              router.replace('/login')
            }
          }
        })
    },
    getUser (context) {
      axios.get('/account/user/')
        .then((response) => {
          context.commit('setUser', response.data)
        })
    },
    register (context, data) {
      axios.post('/account/register/', data)
        .then(() => {
          router.push('/login')
        })
    },
    login (context, data) {
      axios.post('/api/token/', data)
        .then((response) => {
          context.dispatch('setTokens', response.data)
          context.commit('setIsAuthenticated', true)
          router.push('/')
        })
    },
    logout (context) {
      context.commit('setIsAuthenticated', false)
      context.commit('setTokens', {
        access: '',
        refresh: '',
      })
    },
    setTokens (context, data) {
      context.commit('setTokens', data)
      axios.defaults.headers.common['Authorization'] = `Bearer ${context.state.token.access}`
    },
    getWeeklyWork (context) {
      const date = new Date()
      axios.get(`/api/work-time/weekly-works/?year=${getYear(date)}&week=${getISOWeek(date)}`)
        .then((response) => {
          if (response.data.length > 0) {
            context.commit('setWeeklyWork', response.data[0])
          } else {
            context.commit('setWeeklyWork', {
              workTime: '0',
            })
          }
        })
    },
    getDailyWork (context) {
      axios.get(`/api/work-time/daily-works/${format(new Date(), 'yyyy-MM-dd')}/`)
        .then((response) => {
          context.commit('setDailyWork', response.data)
        })
        .catch((error) => {
          if (error.response.status === 404) {
            context.commit('setDailyWork', {
              workTime: '0',
            })
          }
        })
    },
    startWork (context) {
      axios.post('/api/work-time/daily-works/')
        .then((response) => {
          context.commit('setDailyWork', response.data)
          context.dispatch('getWeeklyWork')
        })
    },
    endWork (context) {
      axios.put(`/api/work-time/daily-works/${format(new Date(), 'yyyy-MM-dd')}/`)
        .then((response) => {
          context.commit('setDailyWork', response.data)
          context.dispatch('getWeeklyWork')
        })
    },
  }
})

axios.defaults.baseURL = 'https://uf1k81q71i.execute-api.ap-northeast-2.amazonaws.com/prod'
// axios.defaults.baseURL = 'http://localhost:8000'
if (store.state.token.access) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${store.state.token.access}`
} else {
  axios.defaults.headers.common['Authorization'] = null
}

export default store
