<?php
/**
 * Add this example to the child theme's functions.php and adjust the folder URL.
 * Requires WordPress 6.5+ for wp_enqueue_script_module().
 */

add_action(
    'wp_enqueue_scripts',
    static function (): void {
        $component_url = get_stylesheet_directory_uri() . '/assets/vector-canvas';

        wp_enqueue_style(
            'wm-interactive-stats',
            $component_url . '/styles.css',
            array(),
            '1.1.0'
        );

        wp_enqueue_script_module(
            'wm-interactive-stats',
            $component_url . '/stats-section.js',
            array(),
            '1.1.0'
        );
    }
);
