import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome.component';
import { LoginComponent } from './components/login.component';
import { SignupComponent } from './components/signup.component';

export const routes: Routes = [
	{ path: '', component: WelcomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'signup', component: SignupComponent },
	// other routes will be added here (quizzes, admin, ...)
];
