import { asyncRoutes, constantRoutes } from '@/router'
import { getRoutes } from '@/api/role'
import Layout from '@/layout' // Layout 是架构组件，不在后台返回，在文件里单独引入
const _import = require('@/router/_import_' + process.env.NODE_ENV) // 获取组件的方法

/**
 * Use meta.role to determine if the current user has permission
 * @param roles
 * @param route
 */
function hasPermission(roles, route) {
  if (route.meta && route.meta.roles) {
    return roles.some(role => route.meta.roles.includes(role))
  } else {
    return true
  }
}

/**
 * Filter asynchronous routing tables by recursion
 * @param routes asyncRoutes
 * @param roles
 */
export function filterAsyncRoutes(routes, roles) {
  const res = []

  routes.forEach(route => {
    const tmp = { ...route }
    if (hasPermission(roles, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, roles)
      }
      res.push(tmp)
    }
  })

  return res
}

const state = {
  routes: [],
  addRoutes: []
}

const mutations = {
  SET_ROUTES: (state, routes) => {
    state.addRoutes = routes
    state.routes = constantRoutes.concat(routes)
  }
}

/**
 * 遍历后台传来的路由字符串，转换为组件对象
 * @param asyncRouterMap
 * @returns {*}
 */
const filterAsyncRouter = function(asyncRouterMap) {
  return asyncRouterMap.filter(route => {
    if (route.component) {
      if (route.component === 'Layout') { // Layout组件特殊处理
        route.component = Layout
      } else {
        route.component = _import(route.component)
      }
    }
    if (route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children)
    }
    return true
  })
}

/**
 * 获取后台路由
 * @returns {Promise<*|[]>}
 */
const getAsyncRoutes = async function() {
  let _asyncRoutes = []
  await getRoutes().then(res => {
    if (res.code === 20000) {
      _asyncRoutes = _asyncRoutes.concat(res.data)
    }
  })
  _asyncRoutes = filterAsyncRouter(_asyncRoutes)
  return _asyncRoutes
}

const actions = {
  async generateRoutes({ commit }, roles) {
    // 获取动态路由
    const _asyncRoutes = await getAsyncRoutes()
    const AsyncRoutes = _asyncRoutes.length > 1 ? _asyncRoutes : asyncRoutes
    return new Promise(resolve => {
      let accessedRoutes
      if (roles.includes('admin')) {
        accessedRoutes = AsyncRoutes || []
      } else {
        accessedRoutes = filterAsyncRoutes(AsyncRoutes, roles)
      }
      commit('SET_ROUTES', accessedRoutes)
      resolve(accessedRoutes)
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
