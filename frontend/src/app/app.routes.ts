import { Routes } from '@angular/router';
import { WelcomeComponent } from './components/welcome.component';
import { LoginComponent } from './components/login.component';
import { SignupComponent } from './components/signup.component';
import { QuizzesComponent } from './components/quizzes.component';
import { TakeQuizComponent } from './components/take-quiz.component';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';
import { BannedComponent } from './components/banned.component';
import { AdminComponent } from './components/admin.component';

export const routes: Routes = [
	{ path: '', component: WelcomeComponent },
	{ path: 'login', component: LoginComponent },
	{ path: 'signup', component: SignupComponent },
	{ path: 'quizzes', component: QuizzesComponent, canActivate: [authGuard] },
	{ path: 'take-quiz/:id', component: TakeQuizComponent, canActivate: [authGuard] },
	{ path: 'banned', component: BannedComponent },
  	{ path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
];
