-- Add admin RLS policies for services table
CREATE POLICY "Admins can view all services" ON public.services FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert services" ON public.services FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all services" ON public.services FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete all services" ON public.services FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin RLS policies for packages table
CREATE POLICY "Admins can view all packages" ON public.packages FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert packages" ON public.packages FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all packages" ON public.packages FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete all packages" ON public.packages FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin RLS policies for package_services table
CREATE POLICY "Admins can view all package_services" ON public.package_services FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert package_services" ON public.package_services FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update package_services" ON public.package_services FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete package_services" ON public.package_services FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));