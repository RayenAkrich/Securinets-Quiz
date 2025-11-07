import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome.component';

export const routes: Routes = [
	{ path: '', component: WelcomeComponent },
	// other routes will be added here (login, quizzes, admin, ...)
];
