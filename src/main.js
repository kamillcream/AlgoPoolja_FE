import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import LegalPage from './LegalPage.vue'

const legalType = ({ '/privacy': 'privacy', '/terms': 'terms' })[window.location.pathname]
if (legalType) document.title = `${legalType === 'privacy' ? '개인정보처리방침' : '서비스 이용약관'} · AlgoPoolja`
createApp(legalType ? LegalPage : App, legalType ? { type: legalType } : {}).mount('#app')
