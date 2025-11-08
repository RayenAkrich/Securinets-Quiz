import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome.component';
import { LoginComponent } from './components/login.component';
import { SignupComponent } from './components/signup.component';
import { QuizzesComponent } from './components/quizzes.component';
import { authGuard } from './auth.guard';
import { BannedComponent } from './components/banned.component';

export const routes: Routes = [
	{ path: '', component: WelcomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'signup', component: SignupComponent },
	{ path: 'quizzes', component: QuizzesComponent, canActivate: [authGuard] },
	{ path: 'banned', component: BannedComponent },
	// other routes will be added here (admin, ...)
];
